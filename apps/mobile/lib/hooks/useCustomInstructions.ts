import { PREFERENCE_DEFAULTS } from "@blah-chat/shared";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { queryClient } from "@/lib/cache/queryClient";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { usePreferences } from "./usePreferences";

export type CustomInstructions = {
  aboutUser: string;
  responseStyle: string;
  enabled: boolean;
  baseStyleAndTone: string;
  nickname: string;
  occupation: string;
  moreAboutYou: string;
};

export function useCustomInstructions(): CustomInstructions {
  const prefs = usePreferences();
  return (prefs?.customInstructions ??
    PREFERENCE_DEFAULTS.customInstructions) as CustomInstructions;
}

export function useUpdateCustomInstructions() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (instructions: CustomInstructions) => {
      const client = createMobileSdkClient(() => getToken());
      return client.updatePreference("customInstructions", instructions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "preferences"] });
    },
  });

  return useCallback(
    async (instructions: CustomInstructions) =>
      mutation.mutateAsync(instructions),
    [mutation],
  );
}
