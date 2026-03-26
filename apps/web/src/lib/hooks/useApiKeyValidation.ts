import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/api/client";
import { useSDKClient } from "@/lib/api/sdkClient";

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

interface ByokConfig {
  byokEnabled: boolean;
  hasVercelGatewayKey: boolean;
  hasOpenRouterKey: boolean;
  hasGroqKey: boolean;
  hasDeepgramKey: boolean;
}

// Gateway to BYOK key field mapping
const GATEWAY_KEY_MAP: Record<
  string,
  "hasVercelGatewayKey" | "hasOpenRouterKey" | "hasGroqKey"
> = {
  openrouter: "hasOpenRouterKey",
  groq: "hasGroqKey",
  vercel: "hasVercelGatewayKey",
  "vercel-gateway": "hasVercelGatewayKey",
};

const GATEWAY_MESSAGES: Record<string, string> = {
  openrouter:
    "BYOK enabled but OpenRouter API key not configured. Add it in Settings → Advanced.",
  groq: "BYOK enabled but Groq API key not configured. Add it in Settings → Advanced.",
  vercel:
    "BYOK enabled but Vercel AI Gateway key not configured. Add it in Settings → Advanced.",
  "vercel-gateway":
    "BYOK enabled but Vercel AI Gateway key not configured. Add it in Settings → Advanced.",
};

export function useApiKeyValidation() {
  const apiClient = useApiClient();
  const sdk = useSDKClient();

  const [availability, setAvailability] = useState<AvailabilityData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  // Fetch BYOK config via SDK
  const { data: byokConfig } = useQuery<ByokConfig | null>({
    queryKey: ["byok-config"],
    queryFn: async () => {
      try {
        return await sdk.getByokConfig();
      } catch {
        return null;
      }
    },
    staleTime: 30_000,
  });

  // TODO: Phase 15 - need REST route for API key availability check
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const result = await apiClient.get<AvailabilityData>(
          "/api/v1/settings/api-key-availability",
        );
        setAvailability(result);
      } catch (error) {
        console.error("Failed to fetch API key availability:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [apiClient]);

  // BYOK helper: check if a gateway is disabled due to missing BYOK key
  const isModelDisabledByByok = (gateway: string): boolean => {
    if (!byokConfig?.byokEnabled) return false;
    const keyField =
      GATEWAY_KEY_MAP[gateway.toLowerCase()] ?? "hasVercelGatewayKey";
    return !byokConfig[keyField];
  };

  // BYOK helper: get disabled message for a gateway
  const getByokModelDisabledMessage = (gateway: string): string | null => {
    if (!byokConfig?.byokEnabled) return null;
    const keyField =
      GATEWAY_KEY_MAP[gateway.toLowerCase()] ?? "hasVercelGatewayKey";
    if (!byokConfig[keyField]) {
      return GATEWAY_MESSAGES[gateway.toLowerCase()] ?? GATEWAY_MESSAGES.vercel;
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
