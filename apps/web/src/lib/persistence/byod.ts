import {
  type ByodNeonConfig,
  createByodConfigRepository,
  createNeonDatabase,
  getTargetSchemaVersion,
  testNeonConnection,
  validateNeonConnectionString,
} from "@blah-chat/persistence-postgres";
import { BadRequestError } from "@/lib/api/errors";
import {
  decryptConnectionString,
  encryptConnectionString,
} from "@/lib/security/byod";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

export interface ByodConfigSafe {
  id: string;
  neonProjectId?: string | null;
  connectionStatus: string;
  connectionError?: string | null;
  lastHealthCheck?: number | null;
  healthLatencyMs?: number | null;
  schemaVersion: number;
  migrationStatus: string;
  migrationError?: string | null;
  lastMigrationAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

function toSafeConfig(config: ByodNeonConfig): ByodConfigSafe {
  return {
    id: config.id,
    neonProjectId: config.neonProjectId,
    connectionStatus: config.connectionStatus,
    connectionError: config.connectionError,
    lastHealthCheck: config.lastHealthCheck,
    healthLatencyMs: config.healthLatencyMs,
    schemaVersion: config.schemaVersion,
    migrationStatus: config.migrationStatus,
    migrationError: config.migrationError,
    lastMigrationAt: config.lastMigrationAt,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

async function getOwnedConfig(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const repo = createByodConfigRepository(db);
  const config = await repo.findByUserId(user.id);
  return { db, user, repo, config };
}

export async function getByodConfig(
  clerkUserId: string,
): Promise<ByodConfigSafe | null> {
  const { config } = await getOwnedConfig(clerkUserId);
  return config ? toSafeConfig(config) : null;
}

export async function setupByodNeon(
  clerkUserId: string,
  connectionString: string,
) {
  // Validate
  const validation = validateNeonConnectionString(connectionString);
  if (!validation.valid) {
    throw new BadRequestError(validation.error ?? "Invalid connection string");
  }

  const { user, repo } = await getOwnedConfig(clerkUserId);

  // Test connectivity before saving
  const testDb = createNeonDatabase(connectionString);
  const testResult = await testNeonConnection(testDb);
  if (!testResult.valid) {
    throw new BadRequestError(
      testResult.error ?? "Could not connect to Neon database",
    );
  }

  // Encrypt and store
  const encrypted = await encryptConnectionString(connectionString);
  await repo.upsert({
    userId: user.id,
    encryptedConnectionString: encrypted.encrypted,
    encryptionIv: encrypted.iv,
    authTag: encrypted.authTag,
    neonProjectId: validation.neonProjectId,
  });

  // Mark as connected with pending migrations
  const config = await repo.findByUserId(user.id);
  if (config) {
    await repo.updateStatus(config.id, "connected");

    // Compute target version
    const targetVersion = await getTargetSchemaVersion();
    if (config.schemaVersion < targetVersion) {
      await repo.updateMigrationStatus(
        config.id,
        "pending",
        config.schemaVersion,
      );
    }
  }

  return { success: true };
}

export async function testByodConnection(clerkUserId: string) {
  const { config } = await getOwnedConfig(clerkUserId);
  if (!config) {
    throw new BadRequestError("No BYOD configuration found");
  }

  const connectionString = await decryptConnectionString(
    config.encryptedConnectionString,
    config.encryptionIv,
    config.authTag,
  );

  const testDb = createNeonDatabase(connectionString);
  const result = await testNeonConnection(testDb);

  // Update status
  const db = getPersistenceDb();
  const repo = createByodConfigRepository(db);
  await repo.updateHealthCheck(config.id, result.latencyMs, result.valid);

  return {
    success: result.valid,
    latencyMs: result.latencyMs,
    error: result.error,
  };
}

export async function disconnectByod(clerkUserId: string) {
  const { config, repo } = await getOwnedConfig(clerkUserId);
  if (!config) {
    return { success: true };
  }

  await repo.updateStatus(config.id, "disconnected");
  return { success: true };
}

export async function getByodMigrationLogs(clerkUserId: string) {
  const { config, repo } = await getOwnedConfig(clerkUserId);
  if (!config) {
    return [];
  }

  return repo.findMigrationLogs(config.id);
}
