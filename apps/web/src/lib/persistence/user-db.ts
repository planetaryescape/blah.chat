import {
  createNeonDatabase,
  type PersistenceDb,
  resolveUserDatabase,
} from "@blah-chat/persistence-postgres";
import { decryptCredential } from "@/lib/security/byok";

export interface GetChatDbForUserDeps {
  /**
   * Override for tests — by default we construct a Neon connection from the
   * decrypted connection string. Tests inject a mock so they don't open
   * real network sockets.
   */
  createUserDb?: (connectionString: string) => PersistenceDb;
}

/**
 * Resolve the database to use for a given user's chat data.
 *
 * BYOD-enabled users with a healthy `connectionStatus = "connected"` row
 * get their own Neon database. Anything else (no row, error status, decrypt
 * failure) falls back to the primary db so generation never silently lands
 * in the wrong place.
 *
 * Identity, billing, BYOK config — anything not chat data — should continue
 * to use `getPersistenceDb()` directly.
 */
export async function getChatDbForUser(
  primary: PersistenceDb,
  userId: string,
  deps: GetChatDbForUserDeps = {},
): Promise<PersistenceDb> {
  const factory = deps.createUserDb ?? createNeonDatabase;
  // resolveUserDatabase caches per-userId for 5min and will return null if the
  // row doesn't exist or status isn't "connected" — both fall back to primary.
  const userDb = await wrapResolve(primary, userId, factory);
  return userDb ?? primary;
}

async function wrapResolve(
  primary: PersistenceDb,
  userId: string,
  factory: (connectionString: string) => PersistenceDb,
): Promise<PersistenceDb | null> {
  try {
    return await resolveUserDatabase(primary, userId, {
      decrypt: (encrypted: string, iv: string, authTag: string) =>
        decryptCredential(encrypted, iv, authTag),
      createUserDb: factory,
    });
  } catch {
    // Decrypt failure, malformed config, or connection error — fall back to
    // primary rather than risk routing data to the wrong store.
    return null;
  }
}
