import { api } from "@blah-chat/backend/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";

type AvailabilityData = {
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

export function useApiKeyValidation() {
  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const getAvailability = useAction(api.settings.apiKeys.getApiKeyAvailability);
  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const byokConfig = useQuery(api.byok.credentials.getConfig);

  const [availability, setAvailability] = useState<AvailabilityData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const result = await getAvailability({});
        setAvailability(result);
      } catch (error) {
        console.error("Failed to fetch API key availability:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [getAvailability]);

  // BYOK helper: check if a gateway is disabled due to missing BYOK key
  const isModelDisabledByByok = (gateway: string): boolean => {
    if (!byokConfig?.byokEnabled) return false;

    // Map gateway names to BYOK key fields
    switch (gateway.toLowerCase()) {
      case "openrouter":
        return !byokConfig.hasOpenRouterKey;
      case "groq":
        return !byokConfig.hasGroqKey;
      case "vercel":
      case "vercel-gateway":
        return !byokConfig.hasVercelGatewayKey;
      default:
        // For unrecognized gateways, assume Vercel Gateway handles them
        return !byokConfig.hasVercelGatewayKey;
    }
  };

  // BYOK helper: get disabled message for a gateway
  const getByokModelDisabledMessage = (gateway: string): string | null => {
    if (!byokConfig?.byokEnabled) return null;

    switch (gateway.toLowerCase()) {
      case "openrouter":
        if (!byokConfig.hasOpenRouterKey) {
          return "BYOK enabled but OpenRouter API key not configured. Add it in Settings → Advanced.";
        }
        break;
      case "groq":
        if (!byokConfig.hasGroqKey) {
          return "BYOK enabled but Groq API key not configured. Add it in Settings → Advanced.";
        }
        break;
      case "vercel":
      case "vercel-gateway":
        if (!byokConfig.hasVercelGatewayKey) {
          return "BYOK enabled but Vercel AI Gateway key not configured. Add it in Settings → Advanced.";
        }
        break;
    }
    return null;
  };

  if (loading || !availability) {
    return {
      loading: true,
      stt: { enabled: false },
      tts: { enabled: false },
      byok: {
        enabled: false,
        hasVercelKey: false,
        hasOpenRouterKey: false,
        hasGroqKey: false,
        hasDeepgramKey: false,
      },
      getSTTErrorMessage: () => null,
      getTTSErrorMessage: () => null,
      isModelDisabledByByok: () => false,
      getByokModelDisabledMessage: () => null,
    };
  }

  const { isProduction, stt, tts } = availability;

  return {
    loading: false,
    isProduction,

    stt: {
      enabled: stt.hasCurrentProviderKey,
      provider: stt.currentProvider,
      providerKeyName: stt.currentProviderKeyName,
    },

    tts: {
      enabled: tts.deepgram,
    },

    // BYOK status
    byok: {
      enabled: byokConfig?.byokEnabled ?? false,
      hasVercelKey: byokConfig?.hasVercelGatewayKey ?? false,
      hasOpenRouterKey: byokConfig?.hasOpenRouterKey ?? false,
      hasGroqKey: byokConfig?.hasGroqKey ?? false,
      hasDeepgramKey: byokConfig?.hasDeepgramKey ?? false,
    },

    // Helper functions for error messages
    getSTTErrorMessage: () => {
      // Check BYOK first
      if (byokConfig?.byokEnabled && !byokConfig.hasGroqKey) {
        return "Voice input requires Groq API key. Add it in Settings → Advanced.";
      }

      if (stt.hasCurrentProviderKey) return null;

      if (isProduction) {
        return "Speech-to-text is currently unavailable. Please contact your administrator for assistance.";
      }

      return `Speech-to-text requires the ${stt.currentProviderKeyName} environment variable. Your administrator has selected "${stt.currentProvider}" as the STT provider. Add this API key to your .env.local file to enable this feature.`;
    },

    getTTSErrorMessage: () => {
      // Check BYOK first
      if (byokConfig?.byokEnabled && !byokConfig.hasDeepgramKey) {
        return "Text-to-speech requires Deepgram API key. Add it in Settings → Advanced.";
      }

      if (tts.deepgram) return null;

      if (isProduction) {
        return "Text-to-speech is currently unavailable. Please contact your administrator for assistance.";
      }

      return "Text-to-speech requires the DEEPGRAM_API_KEY environment variable. Add this API key to your .env.local file to enable this feature.";
    },

    // BYOK-specific helpers
    isModelDisabledByByok,
    getByokModelDisabledMessage,
  };
}
