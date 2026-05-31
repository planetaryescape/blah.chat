/**
 * @vitest-environment node
 */
import {
  createUserRepository,
  type PersistenceDb,
  userApiKeys,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { encryptCredential, KEY_INDEX } from "@/lib/security/byok";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { resolveByokKeys } from "../byok-resolver";

const ORIGINAL_KEY = process.env.BYOD_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.BYOD_ENCRYPTION_KEY = "test-encryption-key-needs-to-be-long";
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.BYOD_ENCRYPTION_KEY;
  else process.env.BYOD_ENCRYPTION_KEY = ORIGINAL_KEY;
});

async function seedUser(db: PersistenceDb) {
  const users = createUserRepository(db);
  return users.upsertFromClerk({
    clerkId: `clerk_${Math.random().toString(36).slice(2)}`,
    email: "byok@test.com",
    name: "BYOK Tester",
  });
}

async function setVercelGatewayKey(
  db: PersistenceDb,
  userId: string,
  plaintext: string,
  byokEnabled: boolean,
) {
  const sealed = await encryptCredential(plaintext);
  const ivParts = ["", "", "", ""];
  const tagParts = ["", "", "", ""];
  ivParts[KEY_INDEX.vercelGateway] = sealed.iv;
  tagParts[KEY_INDEX.vercelGateway] = sealed.authTag;
  const now = Date.now();
  await db.insert(userApiKeys).values({
    userId,
    byokEnabled,
    encryptedVercelGatewayKey: sealed.encrypted,
    encryptionIVs: ivParts.join(":"),
    authTags: tagParts.join(":"),
    createdAt: now,
    updatedAt: now,
  });
}

describe("resolveByokKeys", () => {
  it("returns disabled when the user has no BYOK row", async () => {
    const db = await createTestPersistenceDb();
    const user = await seedUser(db);

    const result = await resolveByokKeys(db, user.id);

    expect(result).toEqual({ enabled: false });
  });

  it("returns disabled when the user has stored keys but byokEnabled is false", async () => {
    const db = await createTestPersistenceDb();
    const user = await seedUser(db);
    await setVercelGatewayKey(db, user.id, "secret-gateway-key", false);

    const result = await resolveByokKeys(db, user.id);

    expect(result).toEqual({ enabled: false });
  });

  it("returns the decrypted gateway key when byokEnabled is true", async () => {
    const db = await createTestPersistenceDb();
    const user = await seedUser(db);
    await setVercelGatewayKey(db, user.id, "sk-gateway-real-secret", true);

    const result = await resolveByokKeys(db, user.id);

    expect(result.enabled).toBe(true);
    expect(result.gatewayKey).toBe("sk-gateway-real-secret");
  });

  it("throws when byokEnabled is true but the gateway key field is empty", async () => {
    const db = await createTestPersistenceDb();
    const user = await seedUser(db);
    const now = Date.now();
    await db.insert(userApiKeys).values({
      userId: user.id,
      byokEnabled: true,
      encryptionIVs: ":::",
      authTags: ":::",
      createdAt: now,
      updatedAt: now,
    });

    await expect(resolveByokKeys(db, user.id)).rejects.toThrow(
      "BYOK gateway key is unavailable",
    );
  });

  it("throws when byokEnabled is true but the gateway key cannot be decrypted", async () => {
    const db = await createTestPersistenceDb();
    const user = await seedUser(db);
    await setVercelGatewayKey(db, user.id, "sk-gateway-real-secret", true);

    await db
      .update(userApiKeys)
      .set({ encryptedVercelGatewayKey: "00" })
      .where(eq(userApiKeys.userId, user.id));

    await expect(resolveByokKeys(db, user.id)).rejects.toThrow(
      "BYOK gateway key is unavailable",
    );
  });

  it("does not surface the row at all if there is no userApiKeys record", async () => {
    const db = await createTestPersistenceDb();
    const user = await seedUser(db);
    // No insert
    const refreshed = await db.query.userApiKeys.findFirst({
      where: eq(userApiKeys.userId, user.id),
    });
    expect(refreshed).toBeUndefined();

    const result = await resolveByokKeys(db, user.id);
    expect(result).toEqual({ enabled: false });
  });
});
