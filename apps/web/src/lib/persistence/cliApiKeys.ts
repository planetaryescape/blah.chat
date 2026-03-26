import { createHash, randomBytes } from "node:crypto";
import { cliApiKeys } from "@blah-chat/persistence-postgres";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NotFoundError } from "@/lib/api/errors";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

export type ApiCliApiKey = {
  _id: string;
  keyPrefix: string;
  name: string;
  lastUsedAt?: number;
  createdAt: number;
};

function generateApiKey() {
  const bytes = randomBytes(18);
  return `blah_${bytes.toString("base64url")}`;
}

function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function toApiCliApiKey(key: typeof cliApiKeys.$inferSelect): ApiCliApiKey {
  return {
    _id: key.id,
    keyPrefix: key.keyPrefix,
    name: key.name,
    lastUsedAt: key.lastUsedAt ?? undefined,
    createdAt: key.createdAt,
  };
}

async function assertOwnedKey(clerkUserId: string, keyId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const key = await db.query.cliApiKeys.findFirst({
    where: and(eq(cliApiKeys.id, keyId), eq(cliApiKeys.userId, user.id)),
  });

  if (!key) {
    throw new NotFoundError("CLI API key", keyId);
  }

  return { db, key };
}

export async function listCliApiKeys(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const items = await db.query.cliApiKeys.findMany({
    where: and(eq(cliApiKeys.userId, user.id), isNull(cliApiKeys.revokedAt)),
    orderBy: [desc(cliApiKeys.createdAt)],
  });

  return items.map(toApiCliApiKey);
}

export async function createCliApiKey(
  clerkUserId: string,
  input: { name?: string } = {},
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const key = generateApiKey();
  const now = Date.now();

  await db.insert(cliApiKeys).values({
    userId: user.id,
    keyHash: hashApiKey(key),
    keyPrefix: key.slice(0, 12),
    name: input.name?.trim() || `CLI Login - ${new Date(now).toISOString()}`,
    createdAt: now,
  });

  return {
    key,
    keyPrefix: key.slice(0, 12),
    email: user.email,
    name: user.name,
  };
}

export async function revokeCliApiKey(clerkUserId: string, keyId: string) {
  const { db, key } = await assertOwnedKey(clerkUserId, keyId);
  await db
    .update(cliApiKeys)
    .set({ revokedAt: Date.now() })
    .where(eq(cliApiKeys.id, key.id));

  return {
    revoked: true,
    keyId: key.id,
  };
}
