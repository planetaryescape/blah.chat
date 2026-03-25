import { eq } from "drizzle-orm";
import { createNeonDatabase, type PersistenceDb } from "../db";
import { byodNeonConfigs } from "../schema";

interface CacheEntry {
  db: PersistenceDb;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 50;

const cache = new Map<string, CacheEntry>();

function evictExpired() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function evictOldest() {
  if (cache.size < MAX_ENTRIES) return;
  // Map iterates in insertion order — delete the oldest
  const firstKey = cache.keys().next().value;
  if (firstKey) cache.delete(firstKey);
}

export function invalidateByodCache(userId: string) {
  cache.delete(userId);
}

export function clearByodCache() {
  cache.clear();
}

export interface ByodResolverDeps {
  decrypt: (encrypted: string, iv: string, authTag: string) => Promise<string>;
}

/**
 * Resolve a user's BYOD Neon database, or null if they don't have one.
 * Caches drizzle instances per userId with TTL.
 */
export async function resolveUserDatabase(
  mainDb: PersistenceDb,
  userId: string,
  deps: ByodResolverDeps,
): Promise<PersistenceDb | null> {
  // Check cache first
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.db;
  }

  // Look up config
  const config = await mainDb.query.byodNeonConfigs.findFirst({
    where: eq(byodNeonConfigs.userId, userId),
  });

  if (!config || config.connectionStatus !== "connected") {
    return null;
  }

  // Decrypt and create connection
  const connectionString = await deps.decrypt(
    config.encryptedConnectionString,
    config.encryptionIv,
    config.authTag,
  );

  const userDb = createNeonDatabase(connectionString);

  // Cache with eviction
  evictExpired();
  evictOldest();
  cache.set(userId, {
    db: userDb,
    expiresAt: Date.now() + TTL_MS,
  });

  return userDb;
}
