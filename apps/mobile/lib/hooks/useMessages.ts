import { useAuth } from "@clerk/clerk-expo";
import {
  useMutation as useTanstackMutation,
  useQuery as useTanstackQuery,
} from "@tanstack/react-query";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { useMemo } from "react";
import type { Doc, Id } from "@/lib/convex";
import { api } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { shouldUseConvexTransport } from "@/lib/transport/mode";

type Message = Doc<"messages">;

export function useMessages(conversationId: Id<"conversations"> | null) {
  const useConvexMode = shouldUseConvexTransport();
  const { getToken } = useAuth();

  const convexMessages = useConvexQuery(
    api.messages.list,
    useConvexMode && conversationId ? { conversationId } : "skip",
  ) as Message[] | undefined;

  const httpQuery = useTanstackQuery({
    queryKey: ["mobile", "messages", conversationId],
    enabled: !useConvexMode && !!conversationId,
    staleTime: 2_000,
    refetchInterval: 1_500,
    queryFn: async () => {
      if (!conversationId) {
        return null;
      }

      const client = createMobileSdkClient(() => getToken());
      const messages = await client.listMessages(conversationId);
      return messages as Message[];
    },
  });

  const allMessages = useConvexMode
    ? convexMessages
    : (httpQuery.data as Message[] | undefined);

  return useMemo(() => {
    if (!allMessages) return allMessages;
    return allMessages.filter((m: Message) => m.isActiveBranch !== false);
  }, [allMessages]);
}

export function useSendMessage() {
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(api.chat.sendMessage);
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async (args: {
      conversationId: Id<"conversations">;
      content: string;
      modelId?: string;
      models?: string[];
      thinkingEffort?: "none" | "low" | "medium" | "high";
      attachments?: Array<{
        type: "file" | "image" | "audio";
        name: string;
        storageId: string;
        mimeType: string;
        size: number;
      }>;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.sendMessage(args.conversationId, {
        content: args.content,
        modelId: args.modelId,
        models: args.models,
        thinkingEffort: args.thinkingEffort,
        attachments: args.attachments,
      });
    },
  });

  if (useConvexMode) {
    return convexMutation;
  }

  return async (args: {
    conversationId: Id<"conversations">;
    content: string;
    modelId?: string;
    models?: string[];
    thinkingEffort?: "none" | "low" | "medium" | "high";
    attachments?: Array<{
      type: "file" | "image" | "audio";
      name: string;
      storageId: string;
      mimeType: string;
      size: number;
    }>;
  }) => {
    return httpMutation.mutateAsync(args);
  };
}
