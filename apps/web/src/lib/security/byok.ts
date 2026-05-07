import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export type KeyType = "vercelGateway" | "openRouter" | "groq" | "deepgram";

export const MIN_API_KEY_LENGTH = 10;

export const KEY_INDEX: Record<KeyType, number> = {
  vercelGateway: 0,
  openRouter: 1,
  groq: 2,
  deepgram: 3,
};

export const FIELD_MAP: Record<
  KeyType,
  | "encryptedVercelGatewayKey"
  | "encryptedOpenRouterKey"
  | "encryptedGroqKey"
  | "encryptedDeepgramKey"
> = {
  vercelGateway: "encryptedVercelGatewayKey",
  openRouter: "encryptedOpenRouterKey",
  groq: "encryptedGroqKey",
  deepgram: "encryptedDeepgramKey",
};

export const PROVIDER_NAMES: Record<KeyType, string> = {
  vercelGateway: "Vercel AI Gateway",
  openRouter: "OpenRouter",
  groq: "Groq",
  deepgram: "Deepgram",
};

export function parseParts(value: string | null | undefined) {
  return value?.split(":") ?? ["", "", "", ""];
}

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

export async function encryptCredential(plaintext: string) {
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

export async function decryptCredential(
  encryptedHex: string,
  ivHex: string,
  authTagHex: string,
) {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
