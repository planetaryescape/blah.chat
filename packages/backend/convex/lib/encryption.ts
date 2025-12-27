"use node";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.BYOD_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("BYOD_ENCRYPTION_KEY environment variable not set");
  }
  // Key should be 32 bytes (64 hex chars) or we derive it
  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }
  // If not exact length, hash it to get 32 bytes
  const crypto = require("node:crypto");
  return crypto.createHash("sha256").update(key).digest();
}

export async function encryptCredential(
  plaintext: string,
): Promise<{ encrypted: string; iv: string; authTag: string }> {
  const key = getEncryptionKey();
  const iv = randomBytes(16);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export async function decryptCredential(
  encrypted: string,
  iv: string,
  authTag: string,
): Promise<string> {
  const key = getEncryptionKey();

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
