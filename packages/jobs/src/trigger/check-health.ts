import {
  createNeonDatabase,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { sql } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

interface HealthCheckResult {
  postgres: { healthy: boolean; latencyMs: number };
  trigger: { healthy: boolean; latencyMs: number };
  overall: "healthy" | "degraded" | "down";
}

async function checkPostgres(
  db: PersistenceDb,
): Promise<{ healthy: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { healthy: true, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { healthy: false, latencyMs: Math.round(performance.now() - start) };
  }
}

async function checkTriggerApi(): Promise<{
  healthy: boolean;
  latencyMs: number;
}> {
  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) {
    return { healthy: false, latencyMs: 0 };
  }

  const apiUrl = process.env.TRIGGER_API_URL ?? "https://api.trigger.dev";
  const start = performance.now();
  try {
    const response = await fetch(`${apiUrl}/api/v1/runs?limit=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    return {
      healthy: response.ok,
      latencyMs: Math.round(performance.now() - start),
    };
  } catch {
    return { healthy: false, latencyMs: Math.round(performance.now() - start) };
  }
}

export async function checkHealth(
  deps: { db?: PersistenceDb } = {},
): Promise<HealthCheckResult> {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());

  const [postgres, trigger] = await Promise.allSettled([
    checkPostgres(db),
    checkTriggerApi(),
  ]);

  const pg =
    postgres.status === "fulfilled"
      ? postgres.value
      : { healthy: false, latencyMs: 0 };
  const tg =
    trigger.status === "fulfilled"
      ? trigger.value
      : { healthy: false, latencyMs: 0 };

  const allHealthy = pg.healthy && tg.healthy;
  const allDown = !pg.healthy && !tg.healthy;

  return {
    postgres: pg,
    trigger: tg,
    overall: allDown ? "down" : allHealthy ? "healthy" : "degraded",
  };
}
