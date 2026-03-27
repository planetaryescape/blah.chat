import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/cache/queryClient";
import type { Doc, Id } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

type Conversation = Doc<"conversations">;

function isLocalConversationId(conversationId: string | null | undefined) {
  return !!conversationId && conversationId.startsWith("local_conv_");
}

export function useConversations(projectId?: string | null) {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["mobile", "conversations", projectId],
    staleTime: 15_000,
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      const result = await client.listConversations({
        limit: 200,
        archived: false,
        projectId: projectId === "none" ? "none" : (projectId ?? undefined),
      });
      return result.items as Conversation[];
    },
  });

  return query.data as Conversation[] | undefined;
}

export function useConversation(conversationId: Id<"conversations"> | null) {
  const { getToken } = useAuth();
  const isLocalConversation = isLocalConversationId(conversationId);

  const query = useQuery({
    queryKey: ["mobile", "conversation", conversationId],
    enabled: !!conversationId && !isLocalConversation,
    staleTime: 15_000,
    queryFn: async () => {
      if (!conversationId) {
        return null;
      }

      const client = createMobileSdkClient(() => getToken());
      const result = await client.getConversationById(conversationId);
      return result as Conversation | null;
    },
  });

  return query.data as Conversation | null | undefined;
}

export function useCreateConversation() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: {
      model: string;
      title?: string;
      systemPrompt?: string;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      const conversation = await client.createConversation(args);
      return conversation as Conversation;
    },
    onSuccess: (conversation) => {
      queryClient.setQueryData(
        ["mobile", "conversation", conversation._id],
        conversation,
      );
      queryClient.invalidateQueries({ queryKey: ["mobile", "conversations"] });
    },
  });

  return async (args: {
    model: string;
    title?: string;
    systemPrompt?: string;
  }) => {
    const conversation = await mutation.mutateAsync(args);
    return conversation._id as Id<"conversations">;
  };
}

export function useUpdateModel() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: {
      conversationId: Id<"conversations">;
      model: string;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      await client.updateConversation(args.conversationId, {
        model: args.model,
      });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["mobile", "conversation", variables.conversationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["mobile", "conversations"],
      });
    },
  });

  return async (args: { conversationId: Id<"conversations">; model: string }) =>
    mutation.mutateAsync(args);
}
