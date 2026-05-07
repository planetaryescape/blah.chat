import {
  type PersistenceDb,
  userApiKeys,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { decryptCredential, KEY_INDEX, parseParts } from "@/lib/security/byok";

export interface ResolvedByokKeys {
  enabled: boolean;
  gatewayKey?: string;
  openRouterKey?: string;
  groqKey?: string;
  deepgramKey?: string;
}

const DISABLED: ResolvedByokKeys = { enabled: false };

async function tryDecrypt(
  encrypted: string | null | undefined,
  iv: string | undefined,
  tag: string | undefined,
): Promise<string | undefined> {
  if (!encrypted || encrypted === "" || !iv || !tag) {
    return undefined;
  }
  try {
    return await decryptCredential(encrypted, iv, tag);
  } catch {
    return undefined;
  }
}

export async function resolveByokKeys(
  db: PersistenceDb,
  userId: string,
): Promise<ResolvedByokKeys> {
  const config = await db.query.userApiKeys.findFirst({
    where: eq(userApiKeys.userId, userId),
  });

  if (!config?.byokEnabled) {
    return DISABLED;
  }

  const ivParts = parseParts(config.encryptionIVs);
  const tagParts = parseParts(config.authTags);

  const gatewayKey = await tryDecrypt(
    config.encryptedVercelGatewayKey,
    ivParts[KEY_INDEX.vercelGateway],
    tagParts[KEY_INDEX.vercelGateway],
  );

  // Gateway key is the only required key when BYOK is enabled — if it's
  // missing or fails to decrypt, treat the whole config as disabled so
  // generation never silently falls back to the server's gateway key.
  if (!gatewayKey) {
    return DISABLED;
  }

  const [openRouterKey, groqKey, deepgramKey] = await Promise.all([
    tryDecrypt(
      config.encryptedOpenRouterKey,
      ivParts[KEY_INDEX.openRouter],
      tagParts[KEY_INDEX.openRouter],
    ),
    tryDecrypt(
      config.encryptedGroqKey,
      ivParts[KEY_INDEX.groq],
      tagParts[KEY_INDEX.groq],
    ),
    tryDecrypt(
      config.encryptedDeepgramKey,
      ivParts[KEY_INDEX.deepgram],
      tagParts[KEY_INDEX.deepgram],
    ),
  ]);

  return {
    enabled: true,
    gatewayKey,
    openRouterKey,
    groqKey,
    deepgramKey,
  };
}
