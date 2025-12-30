"use node";

import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { encryptCredential } from "../lib/encryption";

// Key type union
const keyTypeValidator = v.union(
  v.literal("vercelGateway"),
  v.literal("openRouter"),
  v.literal("groq"),
  v.literal("deepgram"),
);

type KeyType = "vercelGateway" | "openRouter" | "groq" | "deepgram";

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
 * Validate API key against provider
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

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }

    // Other errors (rate limit, etc.) - key might still be valid
    return { valid: true };
  } catch (error) {
    // Network error - can't validate, assume valid
    console.warn(`Failed to validate ${keyType} key:`, error);
    return { valid: true };
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
    if (!args.apiKey || args.apiKey.trim().length < 10) {
      throw new ConvexError(
        "API key appears to be too short. Please check you've copied the full key.",
      );
    }

    // Validate key against provider (unless skipped)
    if (!args.skipValidation) {
      const validation = await validateApiKey(args.keyType, args.apiKey);
      if (!validation.valid) {
        const providerNames: Record<KeyType, string> = {
          vercelGateway: "Vercel AI Gateway",
          openRouter: "OpenRouter",
          groq: "Groq",
          deepgram: "Deepgram",
        };
        throw new ConvexError(
          validation.error ||
            `Invalid ${providerNames[args.keyType]} API key. Please check the key is correct.`,
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
    const ivParts = existing?.encryptionIVs?.split(":") || ["", "", "", ""];
    const authTagParts = existing?.authTags?.split(":") || ["", "", "", ""];

    // Map key type to index
    const keyIndex: Record<KeyType, number> = {
      vercelGateway: 0,
      openRouter: 1,
      groq: 2,
      deepgram: 3,
    };

    const idx = keyIndex[args.keyType];
    ivParts[idx] = encrypted.iv;
    authTagParts[idx] = encrypted.authTag;

    // Map key type to field name
    const fieldMap: Record<KeyType, string> = {
      vercelGateway: "encryptedVercelGatewayKey",
      openRouter: "encryptedOpenRouterKey",
      groq: "encryptedGroqKey",
      deepgram: "encryptedDeepgramKey",
    };

    // Build update object
    const updateData: Record<string, unknown> = {
      userId: user._id,
      [fieldMap[args.keyType]]: encrypted.encrypted,
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

    // Map key type to field name
    const fieldMap: Record<KeyType, string> = {
      vercelGateway: "encryptedVercelGatewayKey",
      openRouter: "encryptedOpenRouterKey",
      groq: "encryptedGroqKey",
      deepgram: "encryptedDeepgramKey",
    };

    // Clear the IV and authTag for this key
    const ivParts = existing.encryptionIVs?.split(":") || ["", "", "", ""];
    const authTagParts = existing.authTags?.split(":") || ["", "", "", ""];

    const keyIndex: Record<KeyType, number> = {
      vercelGateway: 0,
      openRouter: 1,
      groq: 2,
      deepgram: 3,
    };

    const idx = keyIndex[args.keyType];
    ivParts[idx] = "";
    authTagParts[idx] = "";

    // Build update - set key to undefined and disable BYOK if removing Vercel key
    const updateData: Record<string, unknown> = {
      userId: user._id,
      [fieldMap[args.keyType]]: undefined,
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

    // Get the encrypted key and decrypt it
    const { decryptCredential } = await import("../lib/encryption");

    // Map key type to field and index
    const fieldMap: Record<
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

    const keyIndex: Record<KeyType, number> = {
      vercelGateway: 0,
      openRouter: 1,
      groq: 2,
      deepgram: 3,
    };

    const providerNames: Record<KeyType, string> = {
      vercelGateway: "Vercel AI Gateway",
      openRouter: "OpenRouter",
      groq: "Groq",
      deepgram: "Deepgram",
    };

    const encryptedKey = existing[fieldMap[args.keyType]];
    if (!encryptedKey)
      throw new ConvexError(`No ${providerNames[args.keyType]} key configured`);

    const ivParts = existing.encryptionIVs?.split(":") || [];
    const authTagParts = existing.authTags?.split(":") || [];
    const idx = keyIndex[args.keyType];

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
          `${providerNames[args.keyType]} API key is no longer valid`,
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
