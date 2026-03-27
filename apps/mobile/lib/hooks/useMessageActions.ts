import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/cache/queryClient";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

function invalidateMessageQueries(conversationId?: string) {
  if (conversationId) {
    queryClient.invalidateQueries({
      queryKey: ["mobile", "messages", conversationId],
    });
    queryClient.invalidateQueries({
      queryKey: ["mobile", "active-generation", conversationId],
    });
  }

  queryClient.invalidateQueries({ queryKey: ["mobile", "conversations"] });
}

export function useDeleteMessage() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({ messageId }: { messageId: string }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.deleteMessage(messageId);
    },
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({
        queryKey: ["mobile", "message", variables.messageId],
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: ["mobile", "messages"] });
    },
  });

  return async (args: { messageId: string }) => mutation.mutateAsync(args);
}

export function useEditMessage() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({
      messageId,
      content,
      modelId,
    }: {
      messageId: string;
      content: string;
      modelId?: string;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.editMessage(messageId, { content, modelId });
    },
    onSuccess: (data) => {
      invalidateMessageQueries(data.conversationId);
    },
  });

  return async (args: {
    messageId: string;
    content: string;
    modelId?: string;
  }) => mutation.mutateAsync(args);
}

export function useRegenerateMessage() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({
      messageId,
      modelId,
    }: {
      messageId: string;
      modelId?: string;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.regenerateMessage(messageId, { modelId });
    },
    onSuccess: (data) => {
      invalidateMessageQueries(data.conversationId);
    },
  });

  return async (args: { messageId: string; modelId?: string }) =>
    mutation.mutateAsync(args);
}

export function useBranchMessage() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({ messageId }: { messageId: string }) => {
      const client = createMobileSdkClient(() => getToken());
      const message = await client.getMessage(messageId);
      if (!message.conversationId) {
        throw new Error("Message conversation not found");
      }
      await client.switchConversationBranch(message.conversationId, messageId);
      return {
        conversationId: message.conversationId,
      };
    },
    onSuccess: (data) => {
      invalidateMessageQueries(data.conversationId);
    },
  });

  return async (args: { messageId: string }) => mutation.mutateAsync(args);
}

export function useSwitchBranch() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({
      conversationId,
      targetMessageId,
    }: {
      conversationId: string;
      targetMessageId: string;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.switchConversationBranch(conversationId, targetMessageId);
    },
    onSuccess: (_data, variables) => {
      invalidateMessageQueries(variables.conversationId);
    },
  });

  return async (args: { conversationId: string; targetMessageId: string }) =>
    mutation.mutateAsync(args);
}
