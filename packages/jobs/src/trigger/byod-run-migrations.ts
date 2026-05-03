import {
  createByodConfigRepository,
  createNeonDatabase,
  getTargetSchemaVersion as defaultGetTargetVersion,
  runPendingMigrations as defaultRunMigrations,
  type MigrationRunResult,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { schedules, task } from "@trigger.dev/sdk";

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

export const BYOD_MIGRATION_CRON = {
  pattern: "0 3 * * *", // Daily at 3am UTC
  timezone: "UTC",
  environments: ["PRODUCTION"] as Array<"PRODUCTION">,
};

export interface ByodMigrationDeps {
  db: PersistenceDb;
  findAllPendingMigrations: () => Promise<
    Array<{
      id: string;
      userId: string;
      encryptedConnectionString: string;
      encryptionIv: string;
      authTag: string;
      schemaVersion: number;
    }>
  >;
  decrypt: (encrypted: string, iv: string, authTag: string) => Promise<string>;
  runPendingMigrations: (
    targetDb: PersistenceDb,
    fromIndex: number,
  ) => Promise<MigrationRunResult>;
  getTargetSchemaVersion: () => Promise<number>;
  updateMigrationStatus: (
    configId: string,
    status: string,
    schemaVersion: number,
    error?: string | null,
  ) => Promise<void>;
  createMigrationLog: (input: {
    configId: string;
    userId: string;
    migrationIndex: number;
    migrationTag: string;
    status: string;
    error?: string;
    durationMs?: number;
    startedAt: number;
    completedAt?: number;
  }) => Promise<void>;
}

export interface ByodMigrationJobResult {
  processed: number;
  succeeded: number;
  failed: number;
}

export async function runByodMigrations(
  deps: ByodMigrationDeps,
): Promise<ByodMigrationJobResult> {
  const configs = await deps.findAllPendingMigrations();
  let succeeded = 0;
  let failed = 0;

  for (const config of configs) {
    try {
      // Mark as running
      await deps.updateMigrationStatus(
        config.id,
        "running",
        config.schemaVersion,
      );

      const connectionString = await deps.decrypt(
        config.encryptedConnectionString,
        config.encryptionIv,
        config.authTag,
      );

      const userDb = createNeonDatabase(connectionString);
      const result = await deps.runPendingMigrations(
        userDb,
        config.schemaVersion,
      );

      // Log each applied migration
      for (const migration of result.applied) {
        const now = Date.now();
        await deps.createMigrationLog({
          configId: config.id,
          userId: config.userId,
          migrationIndex: migration.index,
          migrationTag: migration.tag,
          status: migration.status,
          error: migration.error,
          durationMs: migration.durationMs,
          startedAt: now - migration.durationMs,
          completedAt: now,
        });
      }

      // Check if any migration failed
      const hasFailed = result.applied.some((m) => m.status === "failed");
      if (hasFailed) {
        const failedMigration = result.applied.find(
          (m) => m.status === "failed",
        );
        await deps.updateMigrationStatus(
          config.id,
          "failed",
          result.newVersion,
          failedMigration?.error,
        );
        failed++;
      } else {
        await deps.updateMigrationStatus(
          config.id,
          "up_to_date",
          result.newVersion,
        );
        succeeded++;
      }
    } catch (err) {
      await deps
        .updateMigrationStatus(
          config.id,
          "failed",
          config.schemaVersion,
          err instanceof Error ? err.message : "Unknown error",
        )
        .catch(() => {});
      failed++;
    }
  }

  return {
    processed: configs.length,
    succeeded,
    failed,
  };
}

async function defaultDecrypt(
  encrypted: string,
  iv: string,
  authTag: string,
): Promise<string> {
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

function createDefaultDeps(): ByodMigrationDeps {
  const db = createNeonDatabase(getDatabaseUrl());
  const repo = createByodConfigRepository(db);

  return {
    db,
    findAllPendingMigrations: () => repo.findAllPendingMigrations(),
    decrypt: defaultDecrypt,
    runPendingMigrations: (targetDb, fromIndex) =>
      defaultRunMigrations(targetDb, fromIndex),
    getTargetSchemaVersion: () => defaultGetTargetVersion(),
    updateMigrationStatus: (configId, status, version, error) =>
      repo.updateMigrationStatus(configId, status, version, error),
    createMigrationLog: (input) => repo.createMigrationLog(input),
  };
}

// Scheduled daily scan for pending migrations
export const byodMigrationScheduleTask = schedules.task({
  id: "byod-run-migrations-scheduled",
  cron: BYOD_MIGRATION_CRON,
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async () => runByodMigrations(createDefaultDeps()),
});

// On-demand trigger (called from setup flow)
export const byodMigrationOnDemandTask = task({
  id: "byod-run-migrations-on-demand",
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
  },
  run: async (_payload: { configId?: string }) => {
    return runByodMigrations(createDefaultDeps());
  },
});
