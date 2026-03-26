import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { TITLE_GENERATION_MODEL } from "@blah-chat/ai/operational-models";
import { getModel } from "@blah-chat/ai/registry";
import { calculateCost, type UsageTokenInfo } from "@blah-chat/ai/utils";
import {
  conversations,
  createConversationRepository,
  type Message,
  messages,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { generateText } from "ai";
import { asc, eq } from "drizzle-orm";
import { CONVERSATION_TITLE_PROMPT } from "@/lib/prompts/operational";

const MAX_TRANSCRIPT_CHARS = 16_000;

type GenerateTitleResult = {
  success: true;
  skipped?: string;
  title?: string;
};

function truncateMessages(
  messages: Message[],
  charBudget = MAX_TRANSCRIPT_CHARS,
) {
  const complete = messages.filter((message) => {
    return message.status === "complete" && message.content.trim().length > 0;
  });

  if (complete.length === 0) {
    return [];
  }

  const totalChars = complete.reduce((sum, message) => {
    return sum + message.content.length;
  }, 0);

  if (totalChars <= charBudget) {
    return complete;
  }

  const first = complete[0];
  if (!first) {
    return [];
  }

  const remainingBudget = charBudget - first.content.length;
  if (remainingBudget <= 0) {
    return [
      {
        ...first,
        content: first.content.slice(0, charBudget),
      },
    ];
  }

  const recent: Message[] = [];
  let currentBudget = remainingBudget;

  for (let index = complete.length - 1; index > 0; index -= 1) {
    const message = complete[index];
    if (!message) {
      continue;
    }

    if (currentBudget - message.content.length >= 0) {
      recent.unshift(message);
      currentBudget -= message.content.length;
      continue;
    }

    if (currentBudget > 100) {
      recent.unshift({
        ...message,
        content: message.content.slice(-currentBudget),
      });
    }
    break;
  }

  return [first, ...recent];
}

function formatConversation(messages: Message[]) {
  return messages
    .map((message) => {
      const role = message.role === "user" ? "User" : "Assistant";
      return `${role}: ${message.content}`;
    })
    .join("\n\n");
}

function logUsage(input: {
  conversationId: string;
  userId: string;
  usage?: UsageTokenInfo | null;
}) {
  if (!input.usage) {
    return;
  }

  const inputTokens = input.usage.inputTokens ?? 0;
  const outputTokens = input.usage.outputTokens ?? 0;
  const costUsd = calculateCost(TITLE_GENERATION_MODEL.id, {
    inputTokens,
    outputTokens,
  });

  console.info("title generation usage", {
    conversationId: input.conversationId,
    userId: input.userId,
    modelId: TITLE_GENERATION_MODEL.id,
    inputTokens,
    outputTokens,
    cachedInputTokens: input.usage.cachedInputTokens ?? 0,
    reasoningTokens: input.usage.reasoningTokens ?? 0,
    costUsd,
  });
}

export async function generateConversationTitle(input: {
  db: PersistenceDb;
  conversationId: string;
  force?: boolean;
  now?: () => number;
}): Promise<GenerateTitleResult> {
  const conversation = await input.db.query.conversations.findFirst({
    where: eq(conversations.id, input.conversationId),
  });

  if (!conversation) {
    return { success: true, skipped: "not_found" };
  }

  if (!input.force && conversation.title !== "New Chat") {
    return { success: true, skipped: "already_titled" };
  }

  const activePath = await createConversationRepository(input.db).getActivePath(
    input.conversationId,
  );
  const sourceMessages =
    activePath.length > 0
      ? activePath
      : await input.db.query.messages.findMany({
          where: eq(messages.conversationId, input.conversationId),
          orderBy: [asc(messages.createdAt), asc(messages.siblingIndex)],
        });
  const truncated = truncateMessages(sourceMessages);

  if (truncated.length === 0) {
    return { success: true, skipped: "empty_conversation" };
  }

  try {
    const result = await generateText({
      model: getModel(TITLE_GENERATION_MODEL.id),
      prompt: `${CONVERSATION_TITLE_PROMPT}\n\nConversation:\n${formatConversation(truncated)}`,
      providerOptions: getGatewayOptions(
        TITLE_GENERATION_MODEL.id,
        conversation.userId,
        ["title-generation"],
      ),
    });

    const title = result.text.trim();
    if (!title) {
      return { success: true, skipped: "empty_title" };
    }

    logUsage({
      conversationId: input.conversationId,
      userId: conversation.userId,
      usage: result.usage,
    });

    const [updated] = await input.db
      .update(conversations)
      .set({
        title,
        updatedAt: (input.now ?? (() => Date.now()))(),
      })
      .where(eq(conversations.id, input.conversationId))
      .returning();

    return updated
      ? { success: true, title: updated.title }
      : { success: true, skipped: "not_found" };
  } catch (error) {
    console.warn("title generation failed", {
      conversationId: input.conversationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: true, skipped: "generation_failed" };
  }
}
