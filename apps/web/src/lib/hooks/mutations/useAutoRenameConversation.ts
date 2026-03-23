import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";
import { cache } from "@/lib/cache";
import { queryKeys } from "@/lib/query/keys";

interface AutoRenameConversationArgs {
  conversationId: Id<"conversations">;
}

interface AutoRenamedConversation {
  _id: Id<"conversations">;
  title?: string | null;
  updatedAt?: number;
}

export function useAutoRenameConversation() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId }: AutoRenameConversationArgs) => {
      return api.post<AutoRenamedConversation>(
        `/api/v1/conversations/${conversationId}/auto-rename`,
      );
    },

    onSuccess: async (conversation, variables) => {
      await cache.conversations.put(conversation as never);
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(variables.conversationId),
      });
    },
  });
}
