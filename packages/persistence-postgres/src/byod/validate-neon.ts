import { sql } from "drizzle-orm";
import type { PersistenceDb } from "../db";
import { isNeonDatabaseUrl } from "../db";

export interface NeonValidationResult {
  valid: boolean;
  neonProjectId?: string;
  error?: string;
}

export interface NeonConnectionTestResult {
  valid: boolean;
  latencyMs: number;
  error?: string;
}

export function validateNeonConnectionString(
  connectionString: string,
): NeonValidationResult {
  if (!connectionString) {
    return { valid: false, error: "Connection string is required" };
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return { valid: false, error: "Invalid connection string URL format" };
  }

  if (!isNeonDatabaseUrl(connectionString)) {
    return {
      valid: false,
      error: "Only neon.tech connection strings are supported in BYOD v1",
    };
  }

  // Extract Neon project ID from hostname (e.g. ep-cool-123.us-east-1.aws.neon.tech)
  const hostParts = url.hostname.split(".");
  const neonProjectId = hostParts[0] || undefined;

  return { valid: true, neonProjectId };
}

export async function testNeonConnection(
  db: PersistenceDb,
  timeoutMs = 10_000,
): Promise<NeonConnectionTestResult> {
  const start = performance.now();
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Connection timed out")), timeoutMs),
      ),
    ]);
    return {
      valid: true,
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    return {
      valid: false,
      latencyMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
