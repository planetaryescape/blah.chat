import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

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

  if (loading || !availability) {
    return {
      loading: true,
      stt: { enabled: false },
      tts: { enabled: false },
      getSTTErrorMessage: () => null,
      getTTSErrorMessage: () => null,
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

    // Helper functions for error messages
    getSTTErrorMessage: () => {
      if (stt.hasCurrentProviderKey) return null;

      if (isProduction) {
        return "Speech-to-text is currently unavailable. Please contact your administrator for assistance.";
      }

      return `Speech-to-text requires the ${stt.currentProviderKeyName} environment variable. Your administrator has selected "${stt.currentProvider}" as the STT provider. Add this API key to your .env.local file to enable this feature.`;
    },

    getTTSErrorMessage: () => {
      if (tts.deepgram) return null;

      if (isProduction) {
        return "Text-to-speech is currently unavailable. Please contact your administrator for assistance.";
      }

      return "Text-to-speech requires the DEEPGRAM_API_KEY environment variable. Add this API key to your .env.local file to enable this feature.";
    },
  };
}
