import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

interface RegenerateMessageArgs {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
}

export function useRegenerateMessage() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId }: RegenerateMessageArgs) => {
      return api.post(`/api/v1/messages/${messageId}/regenerate`);
    },

    onSuccess: (_data, variables) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.list(variables.conversationId),
      });

      toast.success("Regenerating message...");
    },

    onError: (error) => {
      const msg =
        error instanceof Error ? error.message : "Failed to regenerate message";
      toast.error(msg);
    },
  });
}
