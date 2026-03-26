import { userApiKeys } from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { BadRequestError } from "@/lib/api/errors";
import {
  encryptCredential,
  FIELD_MAP,
  KEY_INDEX,
  type KeyType,
  MIN_API_KEY_LENGTH,
  PROVIDER_NAMES,
  parseParts,
} from "@/lib/security/byok";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

type ByokConfigRow = typeof userApiKeys.$inferSelect;

const VALIDATION_ENDPOINTS: Record<
  KeyType,
  { url: string; authHeader: string }
> = {
  vercelGateway: {
    url: "https://api.vercel.com/v1/integrations/ai/models",
    authHeader: "Bearer",
  },
  openRouter: {
    url: "https://openrouter.ai/api/v1/models",
    authHeader: "Bearer",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/models",
    authHeader: "Bearer",
  },
  deepgram: {
    url: "https://api.deepgram.com/v1/projects",
    authHeader: "Token",
  },
};

export type ApiByokConfig = {
  _id: string;
  byokEnabled: boolean;
  hasVercelGatewayKey: boolean;
  hasOpenRouterKey: boolean;
  hasGroqKey: boolean;
  hasDeepgramKey: boolean;
  lastValidated?: {
    vercelGateway?: number;
    openRouter?: number;
    groq?: number;
    deepgram?: number;
  };
  createdAt: number;
  updatedAt: number;
};

function hasStoredKey(value: string | null | undefined) {
  return Boolean(value && value !== "");
}

function toApiByokConfig(config: ByokConfigRow): ApiByokConfig {
  return {
    _id: config.id,
    byokEnabled: config.byokEnabled,
    hasVercelGatewayKey: hasStoredKey(config.encryptedVercelGatewayKey),
    hasOpenRouterKey: hasStoredKey(config.encryptedOpenRouterKey),
    hasGroqKey: hasStoredKey(config.encryptedGroqKey),
    hasDeepgramKey: hasStoredKey(config.encryptedDeepgramKey),
    lastValidated: config.lastValidated ?? undefined,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

async function validateApiKey(keyType: KeyType, apiKey: string) {
  const endpoint = VALIDATION_ENDPOINTS[keyType];
  const response = await fetch(endpoint.url, {
    method: "GET",
    headers: {
      Authorization: `${endpoint.authHeader} ${apiKey}`,
    },
  });

  if (response.ok) {
    return;
  }

  if (response.status === 401 || response.status === 403) {
    throw new BadRequestError("Invalid API key");
  }

  if (response.status >= 400 && response.status < 500) {
    throw new BadRequestError("API key rejected by provider");
  }

  throw new BadRequestError("Could not validate key. Try again later.");
}

async function getOwnedConfig(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const config = await db.query.userApiKeys.findFirst({
    where: eq(userApiKeys.userId, user.id),
  });

  return { db, user, config };
}

export async function getByokConfig(clerkUserId: string) {
  const { config } = await getOwnedConfig(clerkUserId);
  return config ? toApiByokConfig(config) : null;
}

export async function saveByokApiKey(
  clerkUserId: string,
  input: {
    keyType: KeyType;
    apiKey: string;
    skipValidation?: boolean;
  },
) {
  if (!input.apiKey || input.apiKey.trim().length < MIN_API_KEY_LENGTH) {
    throw new BadRequestError(
      `API key must be at least ${MIN_API_KEY_LENGTH} characters.`,
    );
  }

  if (!input.skipValidation) {
    await validateApiKey(input.keyType, input.apiKey);
  }

  const { db, user, config } = await getOwnedConfig(clerkUserId);
  const encrypted = await encryptCredential(input.apiKey);
  const ivParts = parseParts(config?.encryptionIVs);
  const authTagParts = parseParts(config?.authTags);
  const now = Date.now();
  const idx = KEY_INDEX[input.keyType];

  ivParts[idx] = encrypted.iv;
  authTagParts[idx] = encrypted.authTag;

  const nextValues = {
    [FIELD_MAP[input.keyType]]: encrypted.encrypted,
    encryptionIVs: ivParts.join(":"),
    authTags: authTagParts.join(":"),
    lastValidated: {
      ...(config?.lastValidated ?? {}),
      [input.keyType]: now,
    },
    updatedAt: now,
  };

  if (config) {
    await db
      .update(userApiKeys)
      .set(nextValues)
      .where(eq(userApiKeys.id, config.id));
  } else {
    await db.insert(userApiKeys).values({
      userId: user.id,
      byokEnabled: false,
      createdAt: now,
      ...nextValues,
    });
  }

  return { success: true };
}

export async function removeByokApiKey(
  clerkUserId: string,
  input: { keyType: KeyType },
) {
  const { db, config } = await getOwnedConfig(clerkUserId);

  if (!config) {
    return { success: true };
  }

  const ivParts = parseParts(config.encryptionIVs);
  const authTagParts = parseParts(config.authTags);
  const idx = KEY_INDEX[input.keyType];

  ivParts[idx] = "";
  authTagParts[idx] = "";

  await db
    .update(userApiKeys)
    .set({
      [FIELD_MAP[input.keyType]]: "",
      encryptionIVs: ivParts.join(":"),
      authTags: authTagParts.join(":"),
      byokEnabled:
        input.keyType === "vercelGateway" ? false : config.byokEnabled,
      updatedAt: Date.now(),
    })
    .where(eq(userApiKeys.id, config.id));

  return { success: true };
}

export async function enableByok(clerkUserId: string) {
  const { db, config } = await getOwnedConfig(clerkUserId);

  if (!config || !hasStoredKey(config.encryptedVercelGatewayKey)) {
    throw new BadRequestError(
      `${PROVIDER_NAMES.vercelGateway} key required to enable BYOK`,
    );
  }

  await db
    .update(userApiKeys)
    .set({
      byokEnabled: true,
      updatedAt: Date.now(),
    })
    .where(eq(userApiKeys.id, config.id));

  return { success: true };
}

export async function disableByok(clerkUserId: string) {
  const { db, config } = await getOwnedConfig(clerkUserId);

  if (!config) {
    return { success: true };
  }

  await db
    .update(userApiKeys)
    .set({
      byokEnabled: false,
      updatedAt: Date.now(),
    })
    .where(eq(userApiKeys.id, config.id));

  return { success: true };
}
