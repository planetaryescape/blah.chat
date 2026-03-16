import type { Conversation, Message } from "@blah-chat/persistence-postgres";

export function toApiConversation(
  conversation: Conversation & {
    messageCount?: number;
    lastMessageAt?: number | null;
  },
) {
  return {
    _id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    archived: conversation.archived,
    messageCount: conversation.messageCount ?? 0,
    lastMessageAt: conversation.lastMessageAt ?? conversation.updatedAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export function toApiMessage(message: Message) {
  return toApiMessageWithMeta(message);
}

export function toApiMessageWithMeta(
  message: Message,
  meta?: {
    parentMessageId?: string;
    parentMessageIds?: string[];
    isActiveBranch?: boolean;
  },
) {
  const statusMap: Record<
    string,
    "pending" | "generating" | "complete" | "stopped" | "error"
  > = {
    pending: "pending",
    streaming: "generating",
    running: "generating",
    complete: "complete",
    cancelled: "stopped",
    stopped: "stopped",
    error: "error",
  };

  return {
    _id: message.id,
    conversationId: message.conversationId,
    role: message.role as "user" | "assistant" | "system",
    content: message.content,
    partialContent:
      message.status === "streaming" || message.status === "pending"
        ? message.content
        : undefined,
    status: statusMap[message.status] ?? "complete",
    model: message.model,
    comparisonGroupId: message.comparisonGroupId ?? undefined,
    rootMessageId: message.rootMessageId ?? undefined,
    siblingIndex: message.siblingIndex,
    forkReason: message.forkReason ?? undefined,
    parentMessageId: meta?.parentMessageId,
    parentMessageIds: meta?.parentMessageIds,
    isActiveBranch: meta?.isActiveBranch ?? false,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    _creationTime: message.createdAt,
  };
}
