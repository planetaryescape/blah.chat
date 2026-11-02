import { PREFERENCE_DEFAULTS } from "@blah-chat/shared";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation as useTanstackMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { useCallback } from "react";
import { queryClient } from "@/lib/cache/queryClient";
import { api } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { shouldUseConvexTransport } from "@/lib/transport/mode";
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
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(api.users.updateCustomInstructions);
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async (instructions: CustomInstructions) => {
      const client = createMobileSdkClient(() => getToken());
      return client.updatePreference("customInstructions", instructions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "preferences"] });
    },
  });

  return useCallback(
    async (instructions: CustomInstructions) => {
      if (useConvexMode) {
        await convexMutation({
          aboutUser: instructions.aboutUser,
          responseStyle: instructions.responseStyle,
          enabled: instructions.enabled,
          baseStyleAndTone: instructions.baseStyleAndTone as any,
          nickname: instructions.nickname,
          occupation: instructions.occupation,
          moreAboutYou: instructions.moreAboutYou,
        });
      } else {
        await httpMutation.mutateAsync(instructions);
      }
    },
    [useConvexMode, convexMutation, httpMutation],
  );
}
