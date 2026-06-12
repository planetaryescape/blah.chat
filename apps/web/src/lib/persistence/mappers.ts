import type { ThinkingEffort } from "@blah-chat/ai";
import type { Conversation, Message } from "@blah-chat/persistence-postgres";

export function toApiConversation(
  conversation: Conversation & {
    messageCount?: number;
    lastMessageAt?: number | null;
    selectedIntegrationIds?: string[];
  },
) {
  return {
    _id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    projectId: conversation.projectId ?? undefined,
    isIncognito: conversation.isIncognito,
    incognitoSettings: conversation.incognitoSettings ?? undefined,
    pinned: conversation.pinned,
    archived: conversation.archived,
    starred: conversation.starred,
    thinkingEffort: (conversation.thinkingEffort ?? "none") as ThinkingEffort,
    selectedIntegrationIds: conversation.selectedIntegrationIds ?? [],
    modelRecommendation: conversation.modelRecommendation ?? undefined,
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
    attachments?: Array<{
      id: string;
      type: "file" | "image" | "audio";
      storageId: string;
      name: string;
      mimeType: string;
      size: number;
      url?: string;
    }>;
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
    clientMessageId: message.clientMessageId ?? undefined,
    partialContent:
      message.status === "streaming" || message.status === "pending"
        ? message.content
        : undefined,
    status: statusMap[message.status] ?? "complete",
    model: message.model,
    comparisonGroupId: message.comparisonGroupId ?? undefined,
    consolidatedMessageId: message.consolidatedMessageId ?? undefined,
    isConsolidation: message.isConsolidation,
    rootMessageId: message.rootMessageId ?? undefined,
    siblingIndex: message.siblingIndex,
    forkReason: message.forkReason ?? undefined,
    attachments: meta?.attachments,
    parentMessageId: meta?.parentMessageId,
    parentMessageIds: meta?.parentMessageIds,
    isActiveBranch: meta?.isActiveBranch ?? false,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    _creationTime: message.createdAt,
  };
}
