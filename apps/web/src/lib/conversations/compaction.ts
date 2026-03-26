import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { SUMMARIZATION_MODEL } from "@blah-chat/ai/operational-models";
import { getModel } from "@blah-chat/ai/registry";
import {
  conversations,
  messages,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { MIN_MESSAGES_FOR_COMPACTION } from "@blah-chat/shared/limits";
import { generateText } from "ai";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  buildCompactionPrompt,
  CONVERSATION_COMPACTION_PROMPT,
} from "@/lib/prompts/operational";

const MAX_TRANSCRIPT_CHARS = 16000;

export type ConversationSummarizer = (input: {
  modelId: string;
  system: string;
  prompt: string;
}) => Promise<{ text: string }>;

export async function summarizeConversation(input: {
  modelId: string;
  system: string;
  prompt: string;
}) {
  return generateText({
    model: getModel(input.modelId),
    system: input.system,
    prompt: input.prompt,
    temperature: 0.7,
    providerOptions: getGatewayOptions(input.modelId, undefined, [
      "conversation-compaction",
    ]),
  });
}

export async function compactConversation(input: {
  db: PersistenceDb;
  userId: string;
  conversationId: string;
  targetModel?: string;
  summarize?: ConversationSummarizer;
}) {
  const summarize = input.summarize ?? summarizeConversation;
  const conversation = await input.db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, input.conversationId),
      eq(conversations.userId, input.userId),
    ),
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const sourceMessages = await input.db.query.messages.findMany({
    where: eq(messages.conversationId, conversation.id),
    orderBy: (_table, { asc: orderAsc }) => [
      orderAsc(messages.createdAt),
      orderAsc(messages.siblingIndex),
    ],
  });

  if (sourceMessages.length < MIN_MESSAGES_FOR_COMPACTION) {
    throw new Error("Conversation too short to compact");
  }

  const completeMessages = sourceMessages.filter(
    (message) => message.status === "complete",
  );
  const transcript = completeMessages
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`,
    )
    .join("\n\n")
    .slice(0, MAX_TRANSCRIPT_CHARS);

  const result = await summarize({
    modelId: SUMMARIZATION_MODEL.id,
    system: CONVERSATION_COMPACTION_PROMPT,
    prompt: buildCompactionPrompt(transcript),
  });
  const summary = result.text.trim();
  const targetModel = input.targetModel || conversation.model;

  const [newConversation] = await input.db
    .insert(conversations)
    .values({
      userId: input.userId,
      model: targetModel,
      title: `${conversation.title} (continued)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .returning();

  if (!newConversation) {
    throw new Error("Failed to create compacted conversation");
  }

  const compactedMessageId = nanoid();
  const [compactedMessage] = await input.db
    .insert(messages)
    .values({
      id: compactedMessageId,
      conversationId: newConversation.id,
      userId: input.userId,
      role: "assistant",
      content: `**Recap from previous conversation:**\n\n${summary}`,
      status: "complete",
      model: targetModel,
      rootMessageId: compactedMessageId,
      siblingIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .returning();

  if (!compactedMessage) {
    throw new Error("Failed to create compacted message");
  }

  await input.db
    .update(conversations)
    .set({
      activeLeafMessageId: compactedMessage.id,
      updatedAt: Date.now(),
    })
    .where(eq(conversations.id, newConversation.id));

  return {
    conversationId: newConversation.id,
    messageId: compactedMessage.id,
  };
}
