import { useAuth } from "@clerk/clerk-expo";
import {
  useMutation as useTanstackMutation,
  useQuery as useTanstackQuery,
} from "@tanstack/react-query";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import type { Doc, Id } from "@/lib/convex";
import { api } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { shouldUseConvexTransport } from "@/lib/transport/mode";

type Conversation = Doc<"conversations">;

export function useConversations(projectId?: string | null) {
  const useConvexMode = shouldUseConvexTransport();
  const { getToken } = useAuth();

  const convexData = useConvexQuery(
    api.conversations.list,
    useConvexMode
      ? {
          projectId:
            projectId === "none"
              ? "none"
              : projectId
                ? (projectId as Id<"projects">)
                : undefined,
        }
      : "skip",
  ) as Conversation[] | undefined;

  const httpQuery = useTanstackQuery({
    queryKey: ["mobile", "conversations", projectId],
    enabled: !useConvexMode,
    staleTime: 15_000,
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      const result = await client.listConversations({
        limit: 200,
        archived: false,
      });
      return result.items as Conversation[];
    },
  });

  return useConvexMode
    ? convexData
    : (httpQuery.data as Conversation[] | undefined);
}

export function useConversation(conversationId: Id<"conversations"> | null) {
  const useConvexMode = shouldUseConvexTransport();
  const { getToken } = useAuth();

  const convexData = useConvexQuery(
    api.conversations.get,
    useConvexMode && conversationId ? { conversationId } : "skip",
  ) as Conversation | null | undefined;

  const httpQuery = useTanstackQuery({
    queryKey: ["mobile", "conversation", conversationId],
    enabled: !useConvexMode && !!conversationId,
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

  return useConvexMode
    ? convexData
    : (httpQuery.data as Conversation | null | undefined);
}

export function useCreateConversation() {
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(api.conversations.create);
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async (args: {
      model: string;
      title?: string;
      systemPrompt?: string;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      const conversation = await client.createConversation(args);
      return conversation._id as Id<"conversations">;
    },
  });

  if (useConvexMode) {
    return convexMutation;
  }

  return async (args: {
    model: string;
    title?: string;
    systemPrompt?: string;
  }) => {
    return httpMutation.mutateAsync(args);
  };
}

export function useUpdateModel() {
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(api.conversations.updateModel);
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async (args: {
      conversationId: Id<"conversations">;
      model: string;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      await client.updateConversation(args.conversationId, {
        model: args.model,
      });
    },
  });

  if (useConvexMode) {
    return convexMutation;
  }

  return async (args: {
    conversationId: Id<"conversations">;
    model: string;
  }) => {
    return httpMutation.mutateAsync(args);
  };
}
