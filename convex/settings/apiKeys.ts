import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Check which API keys are configured (returns boolean, NOT actual keys)
 * Used by frontend to disable features if prerequisites missing
 *
 * Security: Returns availability flags only, never exposes actual key values
 * Performance: Lightweight query, suitable for frequent polling
 *
 * Note: Internal query because it needs Node.js runtime to access process.env
 */
const getApiKeyAvailabilityInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const isProduction = process.env.NODE_ENV === "production";

    // Get current admin-selected STT provider
    const adminSettings = await ctx.db.query("adminSettings").first();

    const currentSTTProvider = adminSettings?.transcriptProvider || "groq";

    // Dynamically check current provider's key
    const providerKeyMap: Record<string, string> = {
      groq: "GROQ_API_KEY",
      openai: "OPENAI_API_KEY",
      deepgram: "DEEPGRAM_API_KEY",
      assemblyai: "ASSEMBLYAI_API_KEY",
    };

    const currentProviderKeyName = providerKeyMap[currentSTTProvider];
    const hasCurrentProviderKey = !!process.env[currentProviderKeyName];

    return {
      stt: {
        // Individual provider availability
        groq: !!process.env.GROQ_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        deepgram: !!process.env.DEEPGRAM_API_KEY,
        assemblyai: !!process.env.ASSEMBLYAI_API_KEY,

        // Current admin selection
        currentProvider: currentSTTProvider,
        currentProviderKeyName,
        hasCurrentProviderKey,
      },
      tts: {
        // TTS currently uses Deepgram exclusively
        deepgram: !!process.env.DEEPGRAM_API_KEY,
      },
      isProduction,
    };
  },
});

/**
 * Public action wrapper for API key availability
 * Frontend calls this, it calls the internal query
 */
export const getApiKeyAvailability = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(internal.settings.apiKeys.getApiKeyAvailabilityInternal, {});
  },
});
