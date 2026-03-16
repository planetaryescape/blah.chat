import { HeadBucketCommand } from "@aws-sdk/client-s3";
import {
  createNeonDatabase,
  createR2Client,
  createRedisClient,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { sql } from "drizzle-orm";

export interface PersistenceHealth {
  database: "ok";
  redis: "ok";
  r2: "ok";
}

export async function checkPersistenceHealth(): Promise<PersistenceHealth> {
  const env = parsePersistenceEnv(process.env);

  const database = createNeonDatabase(env.databaseUrl);
  await database.execute(sql`select 1`);

  const redis = createRedisClient(env);
  await redis.ping();

  const r2 = createR2Client(env);
  await r2.send(
    new HeadBucketCommand({
      Bucket: env.r2.bucket,
    }),
  );

  return {
    database: "ok",
    redis: "ok",
    r2: "ok",
  };
}
