import {
  attachments,
  conversations,
  createSignedReadUrl,
  messages,
  messageToolCalls,
} from "@blah-chat/persistence-postgres";
import { and, asc, eq, inArray } from "drizzle-orm";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";
import { listMessageSources } from "./sources";
import { getPersistenceEnv, getPersistenceR2Client } from "./storage";

type ApiAttachmentMetadata = {
  _id: string;
  _creationTime: number;
  messageId: string;
  conversationId: string;
  userId: string;
  type: "file" | "image" | "audio";
  storageId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
  url?: string;
};

type ApiToolCallMetadata = {
  _id: string;
  _creationTime: number;
  messageId: string;
  conversationId: string;
  userId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
  result?: unknown;
  textPosition?: number;
  isPartial: boolean;
  timestamp: number;
  createdAt: number;
};

export async function listMessageMetadata(
  clerkUserId: string,
  input: { messageIds: string[] },
) {
  if (input.messageIds.length === 0) {
    return {
      attachments: [] as ApiAttachmentMetadata[],
      toolCalls: [] as ApiToolCallMetadata[],
      sources: await listMessageSources(clerkUserId, input),
    };
  }

  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const candidateMessages = await db.query.messages.findMany({
    where: inArray(messages.id, input.messageIds),
  });

  if (candidateMessages.length === 0) {
    return {
      attachments: [] as ApiAttachmentMetadata[],
      toolCalls: [] as ApiToolCallMetadata[],
      sources: [] as Awaited<ReturnType<typeof listMessageSources>>,
    };
  }

  const conversationIds = [
    ...new Set(candidateMessages.map((row) => row.conversationId)),
  ];
  const ownedConversations = await db.query.conversations.findMany({
    where: and(
      eq(conversations.userId, user.id),
      inArray(conversations.id, conversationIds),
    ),
  });
  const ownedConversationIds = new Set(
    ownedConversations.map((conversation) => conversation.id),
  );
  const ownedMessageIds = candidateMessages
    .filter((message) => ownedConversationIds.has(message.conversationId))
    .map((message) => message.id);

  if (ownedMessageIds.length === 0) {
    return {
      attachments: [] as ApiAttachmentMetadata[],
      toolCalls: [] as ApiToolCallMetadata[],
      sources: [] as Awaited<ReturnType<typeof listMessageSources>>,
    };
  }

  const [attachmentRows, toolCallRows, sources] = await Promise.all([
    db
      .select({
        id: attachments.id,
        createdAt: attachments.createdAt,
        messageId: attachments.messageId,
        conversationId: attachments.conversationId,
        userId: attachments.userId,
        type: attachments.type,
        key: attachments.key,
        name: attachments.name,
        mimeType: attachments.mimeType,
        size: attachments.size,
      })
      .from(attachments)
      .where(inArray(attachments.messageId, ownedMessageIds))
      .orderBy(asc(attachments.createdAt)),
    db.query.messageToolCalls.findMany({
      where: inArray(messageToolCalls.messageId, ownedMessageIds),
      orderBy: (table, { asc: orderAsc }) => [
        orderAsc(table.timestamp),
        orderAsc(table.createdAt),
      ],
    }),
    listMessageSources(clerkUserId, { messageIds: ownedMessageIds }),
  ]);

  const env = getPersistenceEnv();
  const client = getPersistenceR2Client();
  const mappedAttachments = await Promise.all(
    attachmentRows.map(async (attachment) => ({
      _id: attachment.id,
      _creationTime: attachment.createdAt,
      messageId: attachment.messageId,
      conversationId: attachment.conversationId,
      userId: attachment.userId,
      type: attachment.type as "file" | "image" | "audio",
      storageId: attachment.key,
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: attachment.createdAt,
      url: await createSignedReadUrl({
        client,
        bucket: env.r2.bucket,
        key: attachment.key,
      }),
    })),
  );

  const mappedToolCalls = toolCallRows.map((toolCall) => ({
    _id: toolCall.id,
    _creationTime: toolCall.createdAt,
    messageId: toolCall.messageId,
    conversationId: toolCall.conversationId,
    userId: toolCall.userId,
    toolCallId: toolCall.toolCallId,
    toolName: toolCall.toolName,
    args: toolCall.args,
    result: toolCall.result ?? undefined,
    textPosition: toolCall.textPosition ?? undefined,
    isPartial: toolCall.isPartial,
    timestamp: toolCall.timestamp,
    createdAt: toolCall.createdAt,
  }));

  return {
    attachments: mappedAttachments,
    toolCalls: mappedToolCalls,
    sources,
  };
}
