import type { QueryClient } from "@tanstack/react-query";
import type { Doc, Id } from "@/lib/convex";
import { replaceConversationIdInMessages } from "./messageTree";

type Conversation = Doc<"conversations">;
type Message = Doc<"messages">;

export function buildLocalConversation(input: {
  conversationId: string;
  model: string;
  title?: string;
  createdAt: number;
}) {
  return {
    _id: input.conversationId as Id<"conversations">,
    _creationTime: input.createdAt,
    title: input.title ?? "New Chat",
    model: input.model,
    pinned: false,
    archived: false,
    starred: false,
    messageCount: 0,
    lastMessageAt: input.createdAt,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  } satisfies Conversation;
}

function mergeConversation(
  existing: Conversation | undefined,
  nextConversation: Conversation,
) {
  return {
    ...(existing ?? {}),
    ...nextConversation,
    _id: nextConversation._id,
  } satisfies Conversation;
}

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort((left, right) => {
    const leftTime =
      left.lastMessageAt ?? left.updatedAt ?? left.createdAt ?? 0;
    const rightTime =
      right.lastMessageAt ?? right.updatedAt ?? right.createdAt ?? 0;
    return rightTime - leftTime;
  });
}

export function insertConversationIntoCache(
  queryClient: QueryClient,
  conversation: Conversation,
) {
  queryClient.setQueryData(
    ["mobile", "conversation", conversation._id],
    conversation,
  );

  for (const [queryKey, current] of queryClient.getQueriesData<
    Conversation[] | undefined
  >({
    queryKey: ["mobile", "conversations"],
  })) {
    const next = [
      ...(current ?? []).filter((item) => item._id !== conversation._id),
      conversation,
    ];
    queryClient.setQueryData(queryKey, sortConversations(next));
  }
}

export function reconcileConversationInCache(
  queryClient: QueryClient,
  input: {
    localConversationId: string;
    nextConversation: Conversation;
  },
) {
  const localConversation = queryClient.getQueryData<Conversation>([
    "mobile",
    "conversation",
    input.localConversationId,
  ]);
  const mergedConversation = mergeConversation(
    localConversation,
    input.nextConversation,
  );

  queryClient.setQueryData(
    ["mobile", "conversation", input.nextConversation._id],
    mergedConversation,
  );

  const idsChanged =
    input.localConversationId !== (input.nextConversation._id as string);

  if (idsChanged) {
    queryClient.removeQueries({
      queryKey: ["mobile", "conversation", input.localConversationId],
      exact: true,
    });
  }

  const localMessages = queryClient.getQueryData<Message[]>([
    "mobile",
    "messages",
    input.localConversationId,
  ]);
  if (localMessages) {
    queryClient.setQueryData(
      ["mobile", "messages", input.nextConversation._id],
      replaceConversationIdInMessages(
        localMessages,
        input.localConversationId,
        input.nextConversation._id,
      ),
    );
    if (idsChanged) {
      queryClient.removeQueries({
        queryKey: ["mobile", "messages", input.localConversationId],
        exact: true,
      });
    }
  }

  if (idsChanged) {
    queryClient.removeQueries({
      queryKey: ["mobile", "active-generation", input.localConversationId],
      exact: true,
    });
  }

  for (const [queryKey, current] of queryClient.getQueriesData<
    Conversation[] | undefined
  >({
    queryKey: ["mobile", "conversations"],
  })) {
    const next = (current ?? [])
      .filter(
        (conversation) =>
          conversation._id !== input.localConversationId &&
          conversation._id !== input.nextConversation._id,
      )
      .concat(mergedConversation);
    queryClient.setQueryData(queryKey, sortConversations(next));
  }
}
