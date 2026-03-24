import { HeadBucketCommand } from "@aws-sdk/client-s3";
import {
  createPersistenceDatabase,
  createR2Client,
  createRedisClient,
  createTriggerClient,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { sql } from "drizzle-orm";

export interface PersistenceHealth {
  database: "ok";
  redis: "ok";
  r2: "ok";
  trigger: "ok";
}

export async function checkPersistenceHealth(): Promise<PersistenceHealth> {
  const env = parsePersistenceEnv(process.env);

  const database = createPersistenceDatabase(env.databaseUrl);
  await database.execute(sql`select 1`);

  const redis = createRedisClient(env);
  await redis.ping();

  const r2 = createR2Client(env);
  await r2.send(
    new HeadBucketCommand({
      Bucket: env.r2.bucket,
    }),
  );

  const trigger = createTriggerClient(env);
  await trigger.ping();

  return {
    database: "ok",
    redis: "ok",
    r2: "ok",
    trigger: "ok",
  };
}
