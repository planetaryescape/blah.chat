import { parseDatabaseEnv, parsePersistenceEnv } from "../src/env";

describe("parseDatabaseEnv", () => {
  test("parses database-only environment without Redis or R2", () => {
    const env = parseDatabaseEnv({
      DATABASE_URL: "postgres://user:pass@host/db",
    });

    expect(env).toEqual({
      databaseUrl: "postgres://user:pass@host/db",
    });
  });

  test("throws when database URL is missing", () => {
    expect(() => parseDatabaseEnv({})).toThrow(/DATABASE_URL/);
  });
});

describe("parsePersistenceEnv", () => {
  test("parses valid persistence environment and derives R2 endpoint", () => {
    const env = parsePersistenceEnv({
      DATABASE_URL: "postgres://user:pass@host/db",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
      R2_ACCOUNT_ID: "account123",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "blah-chat-prod",
      TRIGGER_SECRET_KEY: "trigger-secret",
    });

    expect(env.databaseUrl).toBe("postgres://user:pass@host/db");
    expect(env.redis.restUrl).toBe("https://example.upstash.io");
    expect(env.r2.endpoint).toBe("https://account123.r2.cloudflarestorage.com");
    expect(env.r2.region).toBe("auto");
    expect(env.r2.forcePathStyle).toBe(false);
  });

  test("accepts legacy R2 env aliases", () => {
    const env = parsePersistenceEnv({
      DATABASE_URL: "postgres://user:pass@host/db",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
      R2_ACCOUNT_ID: "account123",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET_NAME: "blah-chat-prod",
      R2_ENDPOINT_URL: "https://account123.r2.cloudflarestorage.com",
    });

    expect(env.r2.bucket).toBe("blah-chat-prod");
    expect(env.r2.endpoint).toBe("https://account123.r2.cloudflarestorage.com");
  });

  test("throws when required values are missing", () => {
    expect(() => parsePersistenceEnv({})).toThrow(/DATABASE_URL/);
  });

  test("still throws when Upstash values are missing", () => {
    expect(() =>
      parsePersistenceEnv({
        DATABASE_URL: "postgres://user:pass@host/db",
        R2_ACCOUNT_ID: "account123",
        R2_ACCESS_KEY_ID: "key",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET_NAME: "blah-chat-prod",
      }),
    ).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  test("supports local R2-compatible overrides for MinIO", () => {
    const env = parsePersistenceEnv({
      DATABASE_URL: "postgres://user:pass@host/db",
      UPSTASH_REDIS_REST_URL: "http://localhost:8079",
      UPSTASH_REDIS_REST_TOKEN: "token",
      R2_ACCOUNT_ID: "local",
      R2_ACCESS_KEY_ID: "minioadmin",
      R2_SECRET_ACCESS_KEY: "minioadmin",
      R2_BUCKET: "blah-chat-dev",
      R2_ENDPOINT: "http://localhost:9000",
      R2_REGION: "us-east-1",
      R2_FORCE_PATH_STYLE: "true",
    });

    expect(env.r2.endpoint).toBe("http://localhost:9000");
    expect(env.r2.region).toBe("us-east-1");
    expect(env.r2.forcePathStyle).toBe(true);
  });
});
