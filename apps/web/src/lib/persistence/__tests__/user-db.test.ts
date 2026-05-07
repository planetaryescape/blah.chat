/**
 * @vitest-environment node
 */
import {
  byodNeonConfigs,
  createUserRepository,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptCredential } from "@/lib/security/byok";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";
import { getChatDbForUser } from "../user-db";

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
    email: "byod@test.com",
    name: "BYOD Tester",
  });
}

describe("getChatDbForUser", () => {
  it("returns the primary db when the user has no BYOD config", async () => {
    const primary = await createTestPersistenceDb();
    const user = await seedUser(primary);

    const db = await getChatDbForUser(primary, user.id);

    expect(db).toBe(primary);
  });

  it("returns the primary db when the user has BYOD config but connectionStatus is not connected", async () => {
    const primary = await createTestPersistenceDb();
    const user = await seedUser(primary);
    const sealed = await encryptCredential("postgres://example.test/userdb");
    const now = Date.now();
    await primary.insert(byodNeonConfigs).values({
      userId: user.id,
      encryptedConnectionString: sealed.encrypted,
      encryptionIv: sealed.iv,
      authTag: sealed.authTag,
      connectionStatus: "error",
      createdAt: now,
      updatedAt: now,
    });

    const db = await getChatDbForUser(primary, user.id);

    expect(db).toBe(primary);
  });

  it("returns the primary db when decryption of the BYOD connection string fails", async () => {
    const primary = await createTestPersistenceDb();
    const user = await seedUser(primary);
    const now = Date.now();
    // Seed a row whose encrypted bytes are gibberish — decrypt should throw
    await primary.insert(byodNeonConfigs).values({
      userId: user.id,
      encryptedConnectionString: "not-real-hex",
      encryptionIv: "deadbeef",
      authTag: "cafebabe",
      connectionStatus: "connected",
      createdAt: now,
      updatedAt: now,
    });

    const db = await getChatDbForUser(primary, user.id);

    // Defensive fallback — never silently use a broken user DB
    expect(db).toBe(primary);
  });

  it("calls the user-db factory with the decrypted connection string when connected", async () => {
    const primary = await createTestPersistenceDb();
    const user = await seedUser(primary);
    const sealed = await encryptCredential("postgres://example.test/userdb");
    const now = Date.now();
    await primary.insert(byodNeonConfigs).values({
      userId: user.id,
      encryptedConnectionString: sealed.encrypted,
      encryptionIv: sealed.iv,
      authTag: sealed.authTag,
      connectionStatus: "connected",
      createdAt: now,
      updatedAt: now,
    });

    const fakeUserDb = {} as PersistenceDb;
    const factory = vi.fn().mockReturnValue(fakeUserDb);

    const db = await getChatDbForUser(primary, user.id, {
      createUserDb: factory,
    });

    expect(factory).toHaveBeenCalledWith("postgres://example.test/userdb");
    expect(db).toBe(fakeUserDb);
  });
});
