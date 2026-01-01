"use node";

import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { decryptCredential, encryptCredential } from "../lib/encryption";
import {
  FIELD_MAP,
  KEY_INDEX,
  type KeyType,
  MIN_API_KEY_LENGTH,
  PROVIDER_NAMES,
  parseParts,
} from "./constants";

// Key type union
const keyTypeValidator = v.union(
  v.literal("vercelGateway"),
  v.literal("openRouter"),
  v.literal("groq"),
  v.literal("deepgram"),
);

// Validation endpoints for each provider
const VALIDATION_ENDPOINTS: Record<
  KeyType,
  { url: string; authHeader: string }
> = {
  vercelGateway: {
    url: "https://api.vercel.com/v1/integrations/ai/models",
    authHeader: "Bearer",
  },
  openRouter: {
    url: "https://openrouter.ai/api/v1/models",
    authHeader: "Bearer",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/models",
    authHeader: "Bearer",
  },
  deepgram: {
    url: "https://api.deepgram.com/v1/projects",
    authHeader: "Token",
  },
};

/**
 * Validate API key against provider (fail-secure)
 */
async function validateApiKey(
  keyType: KeyType,
  apiKey: string,
): Promise<{ valid: boolean; error?: string }> {
  const endpoint = VALIDATION_ENDPOINTS[keyType];

  try {
    const response = await fetch(endpoint.url, {
      method: "GET",
      headers: {
        Authorization: `${endpoint.authHeader} ${apiKey}`,
      },
    });

    // Only 2xx responses are valid
    if (response.ok) {
      return { valid: true };
    }

    // Auth errors
    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }

    // Other 4xx = client error (bad key format, etc.)
    if (response.status >= 400 && response.status < 500) {
      return { valid: false, error: "API key rejected by provider" };
    }

    // 5xx = server error - fail secure
    return { valid: false, error: "Could not validate key. Try again later." };
  } catch (error) {
    // Network error - fail secure
    console.warn(`Failed to validate ${keyType} key:`, error);
    return {
      valid: false,
      error: "Could not reach provider. Check your connection.",
    };
  }
}

/**
 * Save and validate an API key
 * Encrypts the key before storing
 */
export const saveApiKey = action({
  args: {
    keyType: keyTypeValidator,
    apiKey: v.string(),
    skipValidation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    )) as Doc<"users"> | null;

    if (!user) throw new ConvexError("Please sign in to continue");

    // Basic format validation
    if (!args.apiKey || args.apiKey.trim().length < MIN_API_KEY_LENGTH) {
      throw new ConvexError(
        `API key must be at least ${MIN_API_KEY_LENGTH} characters. Please check you've copied the full key.`,
      );
    }

    // Validate key against provider (unless skipped)
    if (!args.skipValidation) {
      const validation = await validateApiKey(args.keyType, args.apiKey);
      if (!validation.valid) {
        throw new ConvexError(
          validation.error ||
            `Invalid ${PROVIDER_NAMES[args.keyType]} API key. Please check the key is correct.`,
        );
      }
    }

    // Encrypt the key
    let encrypted: { encrypted: string; iv: string; authTag: string };
    try {
      encrypted = await encryptCredential(args.apiKey);
    } catch (error) {
      // Server-side config error (missing encryption key)
      console.error("BYOK encryption failed:", error);
      throw new ConvexError(
        "BYOK is not available right now. Please contact support.",
      );
    }

    // Get existing config to merge IVs/authTags
    const existing = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byok.credentials.getConfigInternal,
      { userId: user._id },
    )) as Doc<"userApiKeys"> | null;

    // Parse existing IVs and authTags (format: "vercel:openrouter:groq:deepgram")
    const ivParts = parseParts(existing?.encryptionIVs);
    const authTagParts = parseParts(existing?.authTags);

    const idx = KEY_INDEX[args.keyType];
    ivParts[idx] = encrypted.iv;
    authTagParts[idx] = encrypted.authTag;

    // Build update object
    const updateData: Record<string, unknown> = {
      userId: user._id,
      [FIELD_MAP[args.keyType]]: encrypted.encrypted,
      encryptionIVs: ivParts.join(":"),
      authTags: authTagParts.join(":"),
      lastValidated: {
        ...(existing?.lastValidated || {}),
        [args.keyType]: Date.now(),
      },
    };

    // Save via internal mutation
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byok.credentials.upsertConfig,
      updateData,
    );

    return { success: true };
  },
});

/**
 * Remove an API key
 */
export const removeApiKey = action({
  args: {
    keyType: keyTypeValidator,
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    )) as Doc<"users"> | null;

    if (!user) throw new ConvexError("Please sign in to continue");

    // Get existing config
    const existing = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byok.credentials.getConfigInternal,
      { userId: user._id },
    )) as Doc<"userApiKeys"> | null;

    if (!existing) return { success: true };

    // Clear the IV and authTag for this key
    const ivParts = parseParts(existing.encryptionIVs);
    const authTagParts = parseParts(existing.authTags);

    const idx = KEY_INDEX[args.keyType];
    ivParts[idx] = "";
    authTagParts[idx] = "";

    // Build update - set key to empty string and disable BYOK if removing Vercel key
    const updateData: Record<string, unknown> = {
      userId: user._id,
      [FIELD_MAP[args.keyType]]: "",
      encryptionIVs: ivParts.join(":"),
      authTags: authTagParts.join(":"),
    };

    // If removing Vercel Gateway key, disable BYOK
    if (args.keyType === "vercelGateway") {
      updateData.byokEnabled = false;
    }

    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byok.credentials.upsertConfig,
      updateData,
    );

    return { success: true };
  },
});

/**
 * Re-validate an existing API key
 */
export const revalidateKey = action({
  args: {
    keyType: keyTypeValidator,
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    )) as Doc<"users"> | null;

    if (!user) throw new ConvexError("Please sign in to continue");

    // Get existing config
    const existing = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byok.credentials.getConfigInternal,
      { userId: user._id },
    )) as Doc<"userApiKeys"> | null;

    if (!existing) throw new ConvexError("No API keys configured yet");

    const encryptedKey = existing[FIELD_MAP[args.keyType]];
    if (!encryptedKey)
      throw new ConvexError(
        `No ${PROVIDER_NAMES[args.keyType]} key configured`,
      );

    const ivParts = parseParts(existing.encryptionIVs);
    const authTagParts = parseParts(existing.authTags);
    const idx = KEY_INDEX[args.keyType];

    const iv = ivParts[idx];
    const authTag = authTagParts[idx];

    if (!iv || !authTag)
      throw new ConvexError("Unable to decrypt key. Please re-add it.");

    // Decrypt and validate
    const apiKey = await decryptCredential(encryptedKey, iv, authTag);
    const validation = await validateApiKey(args.keyType, apiKey);

    if (!validation.valid) {
      throw new ConvexError(
        validation.error ||
          `${PROVIDER_NAMES[args.keyType]} API key is no longer valid`,
      );
    }

    // Update last validated timestamp
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byok.credentials.upsertConfig,
      {
        userId: user._id,
        lastValidated: {
          ...(existing.lastValidated || {}),
          [args.keyType]: Date.now(),
        },
      },
    );

    return { success: true };
  },
});
