import {
  createByodConfigRepository,
  createNeonDatabase,
  type NeonConnectionTestResult,
  type PersistenceDb,
  testNeonConnection,
} from "@blah-chat/persistence-postgres";
import { schedules } from "@trigger.dev/sdk";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

function getEncryptionKey() {
  const key = process.env.BYOD_ENCRYPTION_KEY;
  if (!key) throw new Error("BYOD_ENCRYPTION_KEY is not set");
  return key;
}

export const BYOD_HEALTH_CHECK_CRON = {
  pattern: "*/30 * * * *",
  timezone: "UTC",
  environments: ["PRODUCTION"] as Array<"PRODUCTION">,
};

export interface ByodHealthCheckDeps {
  db: PersistenceDb;
  findAllConnected: () => Promise<
    Array<{
      id: string;
      encryptedConnectionString: string;
      encryptionIv: string;
      authTag: string;
    }>
  >;
  decrypt: (encrypted: string, iv: string, authTag: string) => Promise<string>;
  testConnection: (db: PersistenceDb) => Promise<NeonConnectionTestResult>;
  updateHealthCheck: (
    configId: string,
    latencyMs: number,
    healthy: boolean,
  ) => Promise<void>;
}

export interface ByodHealthCheckResult {
  checked: number;
  healthy: number;
  unhealthy: number;
  errors: number;
}

export async function checkByodHealth(
  deps: ByodHealthCheckDeps,
): Promise<ByodHealthCheckResult> {
  const configs = await deps.findAllConnected();
  let healthy = 0;
  let unhealthy = 0;
  let errors = 0;

  for (const config of configs) {
    try {
      const connectionString = await deps.decrypt(
        config.encryptedConnectionString,
        config.encryptionIv,
        config.authTag,
      );

      const userDb = createNeonDatabase(connectionString);
      const result = await deps.testConnection(userDb);

      await deps.updateHealthCheck(config.id, result.latencyMs, result.valid);

      if (result.valid) {
        healthy++;
      } else {
        unhealthy++;
      }
    } catch {
      errors++;
      // Update as unhealthy on decrypt/connection errors
      try {
        await deps.updateHealthCheck(config.id, 0, false);
      } catch {
        // Ignore update failure
      }
    }
  }

  return {
    checked: configs.length,
    healthy,
    unhealthy,
    errors,
  };
}

async function defaultDecrypt(
  encrypted: string,
  iv: string,
  authTag: string,
): Promise<string> {
  // Dynamic import to avoid bundling node:crypto in trigger config scan
  const { createDecipheriv, createHash } = await import("node:crypto");
  const rawKey = getEncryptionKey();
  const key =
    rawKey.length === 64
      ? Buffer.from(rawKey, "hex")
      : createHash("sha256").update(rawKey).digest();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key as Uint8Array,
    Buffer.from(iv, "hex") as Uint8Array,
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex") as Uint8Array);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export const byodHealthCheckTask = schedules.task({
  id: "byod-health-check",
  cron: BYOD_HEALTH_CHECK_CRON,
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async () => {
    const db = createNeonDatabase(getDatabaseUrl());
    const repo = createByodConfigRepository(db);

    return checkByodHealth({
      db,
      findAllConnected: () => repo.findAllConnected(),
      decrypt: defaultDecrypt,
      testConnection: (userDb) => testNeonConnection(userDb),
      updateHealthCheck: (configId, latencyMs, healthy) =>
        repo.updateHealthCheck(configId, latencyMs, healthy),
    });
  },
});
