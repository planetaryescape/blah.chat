import { internal } from "../_generated/api";
import { action } from "../_generated/server";

/**
 * API key availability return type
 */
type ApiKeyAvailability = {
  stt: {
    groq: boolean;
    openai: boolean;
    deepgram: boolean;
    assemblyai: boolean;
    currentProvider: string;
    currentProviderKeyName: string;
    hasCurrentProviderKey: boolean;
  };
  tts: {
    deepgram: boolean;
  };
  isProduction: boolean;
};

/**
 * Public action wrapper for API key availability
 * Frontend calls this, it calls the internal query helper
 *
 * Note: Internal query moved to convex/lib/helpers.ts for better reliability
 */
export const getApiKeyAvailability = action({
  args: {},
  handler: async (ctx): Promise<ApiKeyAvailability> => {
    return await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getApiKeyAvailability,
      {},
    );
  },
});
