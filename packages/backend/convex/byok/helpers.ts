"use node";

import type { Doc } from "../_generated/dataModel";
import { decryptCredential } from "../lib/encryption";
import {
  GATEWAY_FIELD_MAP,
  GATEWAY_INDEX,
  type GatewayType,
  parseParts,
} from "./constants";

/**
 * Decrypt a specific API key from BYOK config
 * Returns undefined if key not configured or decryption fails
 */
export async function decryptByokKey(
  config: Doc<"userApiKeys">,
  gateway: GatewayType,
): Promise<string | undefined> {
  const encryptedKey = config[GATEWAY_FIELD_MAP[gateway]];
  if (!encryptedKey) return undefined;

  const ivParts = parseParts(config.encryptionIVs);
  const authTagParts = parseParts(config.authTags);
  const idx = GATEWAY_INDEX[gateway];

  const iv = ivParts[idx];
  const authTag = authTagParts[idx];

  if (!iv || !authTag) return undefined;

  try {
    return await decryptCredential(encryptedKey, iv, authTag);
  } catch (error) {
    console.error(`Failed to decrypt ${gateway} key:`, error);
    return undefined;
  }
}

/**
 * Get all available BYOK API keys (decrypted)
 * Only decrypts keys that are configured
 */
export async function getByokApiKeys(
  config: Doc<"userApiKeys">,
): Promise<Partial<Record<GatewayType, string>>> {
  const keys: Partial<Record<GatewayType, string>> = {};

  for (const gateway of Object.keys(GATEWAY_FIELD_MAP) as GatewayType[]) {
    const key = await decryptByokKey(config, gateway);
    if (key) keys[gateway] = key;
  }

  return keys;
}
