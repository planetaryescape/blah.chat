import { beforeEach, describe, expect, test, vi } from "vitest";

describe("byod encryption", () => {
  const TEST_KEY =
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

  beforeEach(() => {
    vi.stubEnv("BYOD_ENCRYPTION_KEY", TEST_KEY);
  });

  test("encrypt then decrypt roundtrip returns original plaintext", async () => {
    const { encryptConnectionString, decryptConnectionString } = await import(
      "../byod"
    );

    const plaintext =
      "postgresql://user:pass@ep-cool-123.us-east-1.aws.neon.tech/mydb?sslmode=require";

    const { encrypted, iv, authTag } = await encryptConnectionString(plaintext);
    const decrypted = await decryptConnectionString(encrypted, iv, authTag);

    expect(decrypted).toBe(plaintext);
  });

  test("encrypted output differs from plaintext", async () => {
    const { encryptConnectionString } = await import("../byod");

    const plaintext = "postgresql://user:pass@ep-cool-123.neon.tech/db";
    const { encrypted } = await encryptConnectionString(plaintext);

    expect(encrypted).not.toBe(plaintext);
  });

  test("each encryption produces unique IV", async () => {
    const { encryptConnectionString } = await import("../byod");

    const plaintext = "postgresql://user:pass@ep-cool-123.neon.tech/db";
    const result1 = await encryptConnectionString(plaintext);
    const result2 = await encryptConnectionString(plaintext);

    expect(result1.iv).not.toBe(result2.iv);
  });

  test("decrypt with wrong auth tag throws", async () => {
    const { encryptConnectionString, decryptConnectionString } = await import(
      "../byod"
    );

    const { encrypted, iv } = await encryptConnectionString("some-secret");
    const wrongTag = "0".repeat(32);

    await expect(
      decryptConnectionString(encrypted, iv, wrongTag),
    ).rejects.toThrow();
  });

  test("decrypt with wrong IV throws", async () => {
    const { encryptConnectionString, decryptConnectionString } = await import(
      "../byod"
    );

    const { encrypted, authTag } = await encryptConnectionString("some-secret");
    const wrongIv = "0".repeat(32);

    await expect(
      decryptConnectionString(encrypted, wrongIv, authTag),
    ).rejects.toThrow();
  });

  test("throws when BYOD_ENCRYPTION_KEY is not set", async () => {
    vi.stubEnv("BYOD_ENCRYPTION_KEY", "");

    const { encryptConnectionString } = await import("../byod");

    await expect(encryptConnectionString("some-secret")).rejects.toThrow(
      "BYOD_ENCRYPTION_KEY",
    );
  });

  test("handles non-64-char key via SHA-256 derivation", async () => {
    vi.stubEnv("BYOD_ENCRYPTION_KEY", "short-but-valid-key");

    const { encryptConnectionString, decryptConnectionString } = await import(
      "../byod"
    );

    const plaintext = "postgresql://user:pass@ep-cool-123.neon.tech/db";
    const { encrypted, iv, authTag } = await encryptConnectionString(plaintext);
    const decrypted = await decryptConnectionString(encrypted, iv, authTag);

    expect(decrypted).toBe(plaintext);
  });

  test("handles special characters in connection string", async () => {
    const { encryptConnectionString, decryptConnectionString } = await import(
      "../byod"
    );

    const plaintext =
      "postgresql://user:p%40ss%23word!@ep-cool-123.neon.tech/db?sslmode=require&options=project%3Dep-cool-123";
    const { encrypted, iv, authTag } = await encryptConnectionString(plaintext);
    const decrypted = await decryptConnectionString(encrypted, iv, authTag);

    expect(decrypted).toBe(plaintext);
  });
});
