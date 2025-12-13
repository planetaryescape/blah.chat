import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { Id } from "@/convex/_generated/dataModel";

interface ToggleStarArgs {
  conversationId: Id<"conversations">;
}

export function useToggleStar() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId }: ToggleStarArgs) => {
      return api.patch(`/api/v1/conversations/${conversationId}/star`);
    },

    onMutate: async ({ conversationId }) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.lists(),
      });

      // Snapshot previous state
      const previous = queryClient.getQueryData(
        queryKeys.conversations.lists(),
      );

      // Optimistically update (toggle starred field)
      queryClient.setQueriesData(
        { queryKey: queryKeys.conversations.lists() },
        (old: any) => {
          if (!old) return old;
          return old.map((c: any) =>
            c._id === conversationId ? { ...c, starred: !c.starred } : c,
          );
        },
      );

      return { previous };
    },

    onError: (error, variables, context: any) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.conversations.lists(),
          context.previous,
        );
      }
      toast.error("Failed to toggle star");
    },

    onSettled: () => {
      // Refetch to ensure server sync
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.lists(),
      });
    },
  });
}
