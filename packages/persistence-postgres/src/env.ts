import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.url(),
});

const persistenceEnvSchema = databaseEnvSchema.extend({
  UPSTASH_REDIS_REST_URL: z.url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_ENDPOINT: z.url().optional(),
  R2_REGION: z.string().min(1).optional(),
  R2_FORCE_PATH_STYLE: z.enum(["true", "false", "1", "0"]).optional(),
  R2_PUBLIC_BASE_URL: z.url().optional(),
  TRIGGER_SECRET_KEY: z.string().min(1).optional(),
  TRIGGER_API_URL: z.url().optional(),
});

export interface DatabaseEnv {
  databaseUrl: string;
}

export interface PersistenceEnv {
  databaseUrl: string;
  redis: {
    restUrl: string;
    restToken: string;
  };
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint: string;
    region: string;
    forcePathStyle: boolean;
    publicBaseUrl?: string;
  };
  trigger: {
    secretKey?: string;
    apiUrl: string;
  };
}

export function buildR2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function normalizePersistenceEnvInput(
  env: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return {
    ...env,
    R2_BUCKET: env.R2_BUCKET ?? env.R2_BUCKET_NAME,
    R2_ENDPOINT: env.R2_ENDPOINT ?? env.R2_ENDPOINT_URL,
  };
}

export function parseDatabaseEnv(
  env: Record<string, string | undefined>,
): DatabaseEnv {
  const parsed = databaseEnvSchema.parse(env);

  return {
    databaseUrl: parsed.DATABASE_URL,
  };
}

export function parsePersistenceEnv(
  env: Record<string, string | undefined>,
): PersistenceEnv {
  const parsed = persistenceEnvSchema.parse(normalizePersistenceEnvInput(env));

  return {
    databaseUrl: parsed.DATABASE_URL,
    redis: {
      restUrl: parsed.UPSTASH_REDIS_REST_URL,
      restToken: parsed.UPSTASH_REDIS_REST_TOKEN,
    },
    r2: {
      accountId: parsed.R2_ACCOUNT_ID,
      accessKeyId: parsed.R2_ACCESS_KEY_ID,
      secretAccessKey: parsed.R2_SECRET_ACCESS_KEY,
      bucket: parsed.R2_BUCKET,
      endpoint: parsed.R2_ENDPOINT ?? buildR2Endpoint(parsed.R2_ACCOUNT_ID),
      region: parsed.R2_REGION ?? "auto",
      forcePathStyle:
        parsed.R2_FORCE_PATH_STYLE === "true" ||
        parsed.R2_FORCE_PATH_STYLE === "1",
      publicBaseUrl: parsed.R2_PUBLIC_BASE_URL,
    },
    trigger: {
      secretKey: parsed.TRIGGER_SECRET_KEY,
      apiUrl: parsed.TRIGGER_API_URL ?? "https://api.trigger.dev",
    },
  };
}
