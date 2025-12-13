import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

interface UpdatePreferencesArgs {
  key: string;
  value: any;
}

export function useUpdatePreferences() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: UpdatePreferencesArgs) => {
      return api.patch("/api/v1/preferences", args);
    },

    onSuccess: () => {
      // Invalidate preferences cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.preferences.all,
      });
    },

    onError: (error) => {
      const msg =
        error instanceof Error ? error.message : "Failed to update preferences";
      toast.error(msg);
    },
  });
}
