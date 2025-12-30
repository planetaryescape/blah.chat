"use node";

import type { Doc } from "../_generated/dataModel";
import { decryptCredential } from "../lib/encryption";

type GatewayType = "vercel" | "openrouter" | "groq" | "deepgram";

const KEY_INDEX: Record<GatewayType, number> = {
  vercel: 0,
  openrouter: 1,
  groq: 2,
  deepgram: 3,
};

const KEY_FIELD: Record<
  GatewayType,
  | "encryptedVercelGatewayKey"
  | "encryptedOpenRouterKey"
  | "encryptedGroqKey"
  | "encryptedDeepgramKey"
> = {
  vercel: "encryptedVercelGatewayKey",
  openrouter: "encryptedOpenRouterKey",
  groq: "encryptedGroqKey",
  deepgram: "encryptedDeepgramKey",
};

/**
 * Decrypt a specific API key from BYOK config
 * Returns undefined if key not configured
 */
export async function decryptByokKey(
  config: Doc<"userApiKeys">,
  gateway: GatewayType,
): Promise<string | undefined> {
  const encryptedKey = config[KEY_FIELD[gateway]];
  if (!encryptedKey) return undefined;

  const ivParts = config.encryptionIVs?.split(":") || [];
  const authTagParts = config.authTags?.split(":") || [];
  const idx = KEY_INDEX[gateway];

  const iv = ivParts[idx];
  const authTag = authTagParts[idx];

  if (!iv || !authTag) return undefined;

  return decryptCredential(encryptedKey, iv, authTag);
}

/**
 * Get all available BYOK API keys (decrypted)
 * Only decrypts keys that are configured
 */
export async function getByokApiKeys(
  config: Doc<"userApiKeys">,
): Promise<Partial<Record<GatewayType, string>>> {
  const keys: Partial<Record<GatewayType, string>> = {};

  for (const gateway of Object.keys(KEY_FIELD) as GatewayType[]) {
    const key = await decryptByokKey(config, gateway);
    if (key) keys[gateway] = key;
  }

  return keys;
}
