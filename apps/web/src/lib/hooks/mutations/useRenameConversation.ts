import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

interface RenameConversationArgs {
  conversationId: string;
  title: string;
}

export function useRenameConversation() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, title }: RenameConversationArgs) => {
      return api.patch(`/api/v1/conversations/${conversationId}`, { title });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(variables.conversationId),
      });
      toast.success("Conversation renamed");
    },

    onError: (error) => {
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to rename conversation";
      toast.error(msg);
    },
  });
}
