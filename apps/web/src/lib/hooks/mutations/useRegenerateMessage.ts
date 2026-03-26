import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

interface RegenerateMessageArgs {
  messageId: string;
  conversationId: string;
  modelId?: string;
}

export function useRegenerateMessage() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, modelId }: RegenerateMessageArgs) => {
      return api.post(
        `/api/v1/messages/${messageId}/regenerate`,
        modelId ? { modelId } : {},
      );
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
