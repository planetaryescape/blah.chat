import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { queryClient } from "@/lib/cache/queryClient";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

export function useUpdatePreference() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.updatePreference(key, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "preferences"] });
    },
  });

  return useCallback(
    async (key: string, value: unknown) =>
      mutation.mutateAsync({
        key,
        value,
      }),
    [mutation],
  );
}
