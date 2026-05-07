import { HeadBucketCommand } from "@aws-sdk/client-s3";
import {
  createPersistenceDatabase,
  createR2Client,
  createRedisClient,
  createTriggerClient,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { sql } from "drizzle-orm";

export type ComponentStatus =
  | { status: "ok" }
  | { status: "error"; message: string };

export interface PersistenceHealth {
  database: ComponentStatus;
  redis: ComponentStatus;
  r2: ComponentStatus;
  trigger: ComponentStatus;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "unknown error";
  }
}

async function timed<T>(fn: () => Promise<T>): Promise<ComponentStatus> {
  try {
    await fn();
    return { status: "ok" };
  } catch (e) {
    return { status: "error", message: errorMessage(e) };
  }
}

export async function checkPersistenceHealth(): Promise<PersistenceHealth> {
  const env = parsePersistenceEnv(process.env);

  const [database, redis, r2, trigger] = await Promise.all([
    timed(async () => {
      const db = createPersistenceDatabase(env.databaseUrl);
      await db.execute(sql`select 1`);
    }),
    timed(async () => {
      const client = createRedisClient(env);
      await client.ping();
    }),
    timed(async () => {
      const client = createR2Client(env);
      await client.send(new HeadBucketCommand({ Bucket: env.r2.bucket }));
    }),
    timed(async () => {
      const client = createTriggerClient(env);
      await client.ping();
    }),
  ]);

  return { database, redis, r2, trigger };
}

export function isHealthy(health: PersistenceHealth): boolean {
  return (
    health.database.status === "ok" &&
    health.redis.status === "ok" &&
    health.r2.status === "ok" &&
    health.trigger.status === "ok"
  );
}
