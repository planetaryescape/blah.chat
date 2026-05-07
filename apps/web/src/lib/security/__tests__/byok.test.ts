import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptCredential, encryptCredential } from "../byok";

const ORIGINAL_KEY = process.env.BYOD_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.BYOD_ENCRYPTION_KEY = "test-encryption-key-needs-to-be-long";
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.BYOD_ENCRYPTION_KEY;
  else process.env.BYOD_ENCRYPTION_KEY = ORIGINAL_KEY;
});

describe("decryptCredential", () => {
  it("round-trips arbitrary API key strings to original plaintext", async () => {
    const plaintext = "sk-proj-Aa1Bb2Cc3Dd4Ee5_with-special.chars/and+symbols=";
    const sealed = await encryptCredential(plaintext);

    const decrypted = await decryptCredential(
      sealed.encrypted,
      sealed.iv,
      sealed.authTag,
    );

    expect(decrypted).toBe(plaintext);
  });

  it("rejects ciphertext that has been tampered with (auth tag fails)", async () => {
    const sealed = await encryptCredential("super-secret-key");
    const tampered = sealed.encrypted.replace(/.$/, (c) =>
      c === "0" ? "1" : "0",
    );

    await expect(
      decryptCredential(tampered, sealed.iv, sealed.authTag),
    ).rejects.toThrow();
  });

  it("rejects decryption attempted with the wrong IV", async () => {
    const sealed = await encryptCredential("super-secret-key");
    const wrongIv = "0".repeat(sealed.iv.length);

    await expect(
      decryptCredential(sealed.encrypted, wrongIv, sealed.authTag),
    ).rejects.toThrow();
  });
});
