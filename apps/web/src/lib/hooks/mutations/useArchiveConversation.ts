import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNotificationChimes } from "@/hooks/useNotificationChimes";
import { useApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

interface ArchiveConversationArgs {
  conversationId: string;
}

export function useArchiveConversation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { play: playNotificationChime } = useNotificationChimes();

  return useMutation({
    mutationFn: async ({ conversationId }: ArchiveConversationArgs) => {
      return api.post(`/api/v1/conversations/${conversationId}/archive`);
    },

    onSuccess: (_data, _variables) => {
      // Invalidate conversations list
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.lists(),
      });

      toast.success("Conversation archived");
      playNotificationChime("conversationArchived");
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
