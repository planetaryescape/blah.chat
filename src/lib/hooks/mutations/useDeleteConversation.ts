import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { useApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

interface DeleteConversationArgs {
  conversationId: Id<"conversations">;
}

export function useDeleteConversation() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId }: DeleteConversationArgs) => {
      return api.delete(`/api/v1/conversations/${conversationId}`);
    },

    onSuccess: (_data, variables) => {
      // Invalidate conversations list
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.lists(),
      });

      // Remove specific conversation from cache
      queryClient.removeQueries({
        queryKey: queryKeys.conversations.detail(variables.conversationId),
      });

      toast.success("Conversation deleted");
    },

    onError: (error) => {
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to delete conversation";
      toast.error(msg);
    },
  });
}
