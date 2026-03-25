import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

function getEncryptionKey() {
  const key = process.env.BYOD_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("BYOD_ENCRYPTION_KEY environment variable not set");
  }

  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }

  return createHash("sha256").update(key).digest();
}

export async function encryptConnectionString(plaintext: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export async function decryptConnectionString(
  encrypted: string,
  iv: string,
  authTag: string,
) {
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
