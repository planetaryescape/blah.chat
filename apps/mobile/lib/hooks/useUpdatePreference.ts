import { useAuth } from "@clerk/clerk-expo";
import { useMutation as useTanstackMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { useCallback } from "react";
import { queryClient } from "@/lib/cache/queryClient";
import { api } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { shouldUseConvexTransport } from "@/lib/transport/mode";

export function useUpdatePreference() {
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(api.users.updatePreferences);
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.updatePreference(key, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "preferences"] });
    },
  });

  return useCallback(
    async (key: string, value: unknown) => {
      if (useConvexMode) {
        await convexMutation({ preferences: { [key]: value } as any });
      } else {
        await httpMutation.mutateAsync({ key, value });
      }
    },
    [useConvexMode, convexMutation, httpMutation],
  );
}
