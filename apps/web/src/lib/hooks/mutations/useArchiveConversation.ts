import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

interface ArchiveConversationArgs {
  conversationId: Id<"conversations">;
}

export function useArchiveConversation() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId }: ArchiveConversationArgs) => {
      return api.patch(`/api/v1/conversations/${conversationId}/archive`);
    },

    onSuccess: (_data, _variables) => {
      // Invalidate conversations list
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.lists(),
      });

      toast.success("Conversation archived");
    },

    onError: (error) => {
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to archive conversation";
      toast.error(msg);
    },
  });
}
