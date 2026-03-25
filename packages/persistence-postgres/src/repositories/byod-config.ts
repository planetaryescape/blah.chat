import { and, eq } from "drizzle-orm";
import type { PersistenceDb } from "../db";
import { byodMigrationLogs, byodNeonConfigs } from "../schema";

export interface ByodConfigInput {
  userId: string;
  encryptedConnectionString: string;
  encryptionIv: string;
  authTag: string;
  neonProjectId?: string;
}

export function createByodConfigRepository(db: PersistenceDb) {
  return {
    async findByUserId(userId: string) {
      return db.query.byodNeonConfigs.findFirst({
        where: eq(byodNeonConfigs.userId, userId),
      });
    },

    async upsert(input: ByodConfigInput) {
      const now = Date.now();

      await db
        .insert(byodNeonConfigs)
        .values({
          userId: input.userId,
          encryptedConnectionString: input.encryptedConnectionString,
          encryptionIv: input.encryptionIv,
          authTag: input.authTag,
          neonProjectId: input.neonProjectId,
          connectionStatus: "pending",
          migrationStatus: "pending",
          schemaVersion: 0,
          consecutiveFailures: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: byodNeonConfigs.userId,
          set: {
            encryptedConnectionString: input.encryptedConnectionString,
            encryptionIv: input.encryptionIv,
            authTag: input.authTag,
            neonProjectId: input.neonProjectId,
            connectionStatus: "pending",
            migrationStatus: "pending",
            schemaVersion: 0,
            consecutiveFailures: 0,
            connectionError: null,
            migrationError: null,
            updatedAt: now,
          },
        });

      return db.query.byodNeonConfigs.findFirst({
        where: eq(byodNeonConfigs.userId, input.userId),
      });
    },

    async updateStatus(
      configId: string,
      status: string,
      error?: string | null,
    ) {
      await db
        .update(byodNeonConfigs)
        .set({
          connectionStatus: status,
          connectionError: error ?? null,
          consecutiveFailures: status === "connected" ? 0 : undefined,
          updatedAt: Date.now(),
        })
        .where(eq(byodNeonConfigs.id, configId));
    },

    async updateHealthCheck(
      configId: string,
      latencyMs: number,
      healthy: boolean,
    ) {
      const config = await db.query.byodNeonConfigs.findFirst({
        where: eq(byodNeonConfigs.id, configId),
      });
      if (!config) return;

      const newFailures = healthy ? 0 : (config.consecutiveFailures ?? 0) + 1;
      const newStatus =
        newFailures >= 3
          ? "error"
          : healthy
            ? "connected"
            : config.connectionStatus;

      await db
        .update(byodNeonConfigs)
        .set({
          lastHealthCheck: Date.now(),
          healthLatencyMs: latencyMs,
          consecutiveFailures: newFailures,
          connectionStatus: newStatus,
          connectionError: healthy ? null : "Health check failed",
          updatedAt: Date.now(),
        })
        .where(eq(byodNeonConfigs.id, configId));
    },

    async updateMigrationStatus(
      configId: string,
      status: string,
      schemaVersion: number,
      error?: string | null,
    ) {
      await db
        .update(byodNeonConfigs)
        .set({
          migrationStatus: status,
          schemaVersion,
          migrationError: error ?? null,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
        .where(eq(byodNeonConfigs.id, configId));
    },

    async findAllConnected() {
      return db.query.byodNeonConfigs.findMany({
        where: eq(byodNeonConfigs.connectionStatus, "connected"),
      });
    },

    async findAllPendingMigrations() {
      return db.query.byodNeonConfigs.findMany({
        where: and(
          eq(byodNeonConfigs.migrationStatus, "pending"),
          eq(byodNeonConfigs.connectionStatus, "connected"),
        ),
      });
    },

    async deleteByUserId(userId: string) {
      await db
        .delete(byodNeonConfigs)
        .where(eq(byodNeonConfigs.userId, userId));
    },

    // Migration log helpers
    async createMigrationLog(input: {
      configId: string;
      userId: string;
      migrationIndex: number;
      migrationTag: string;
      status: string;
      error?: string;
      durationMs?: number;
      startedAt: number;
      completedAt?: number;
    }) {
      await db.insert(byodMigrationLogs).values({
        configId: input.configId,
        userId: input.userId,
        migrationIndex: input.migrationIndex,
        migrationTag: input.migrationTag,
        status: input.status,
        error: input.error,
        durationMs: input.durationMs,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
        createdAt: Date.now(),
      });
    },

    async findMigrationLogs(configId: string) {
      return db.query.byodMigrationLogs.findMany({
        where: eq(byodMigrationLogs.configId, configId),
        orderBy: (logs, { asc }) => [asc(logs.migrationIndex)],
      });
    },
  };
}
