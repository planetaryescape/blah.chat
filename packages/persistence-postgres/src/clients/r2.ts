import { S3Client } from "@aws-sdk/client-s3";
import type { PersistenceEnv } from "../env";

export function createR2Client(env: Pick<PersistenceEnv, "r2">) {
  return new S3Client({
    region: env.r2.region,
    endpoint: env.r2.endpoint,
    forcePathStyle: env.r2.forcePathStyle,
    credentials: {
      accessKeyId: env.r2.accessKeyId,
      secretAccessKey: env.r2.secretAccessKey,
    },
  });
}
