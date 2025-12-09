import { streamText } from "ai";
import { v } from "convex/values";
import { aiGateway, getGatewayOptions } from "../../src/lib/ai/gateway";
import { MODEL_CONFIG } from "../../src/lib/ai/models";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { CONVERSATION_TITLE_PROMPT } from "../lib/prompts/operational/titleGeneration";

// Model configuration
const TITLE_MODEL = MODEL_CONFIG["meta:llama-3.3-70b"];

type Message = Doc<"messages">;

/**
 * Smart truncation: keep first message + recent messages within char budget.
 * Preserves conversation seed (first msg) and current context (recent msgs).
 */
function truncateMessages(messages: Message[], charBudget = 16000): Message[] {
  // Filter to complete messages only
  const complete = messages.filter((m) => m.status === "complete" && m.content);

  if (complete.length === 0) return [];

  // Calculate total chars
  const totalChars = complete.reduce((sum, m) => sum + m.content.length, 0);

  // If under budget, return all
  if (totalChars <= charBudget) return complete;

  // Smart truncation: keep first + recent
  const first = complete[0];
  const firstChars = first.content.length;
  const remainingBudget = charBudget - firstChars;

  if (remainingBudget <= 0) {
    // First message too long, truncate it
    return [
      {
        ...first,
        content: first.content.substring(0, charBudget),
      },
    ];
  }

  // Take from end backward
  const recent: Message[] = [];
  let currentBudget = remainingBudget;

  for (let i = complete.length - 1; i > 0; i--) {
    const msg = complete[i];
    const msgChars = msg.content.length;

    if (currentBudget - msgChars >= 0) {
      recent.unshift(msg);
      currentBudget -= msgChars;
    } else {
      // Try to fit partial message (min 100 chars worth including)
      if (currentBudget > 100) {
        recent.unshift({
          ...msg,
          content: msg.content.substring(msg.content.length - currentBudget),
        });
      }
      break;
    }
  }

  return [first, ...recent];
}

/**
 * Format messages as conversation history for LLM prompt.
 */
function formatConversation(messages: Message[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      return `${role}: ${m.content}`;
    })
    .join("\n\n");
}

export const generateTitle = internalAction({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    try {
      // Get all messages in conversation
      // FIXME: Convex runQuery type inference causes "excessively deep" error with internal queries
      const messages = await (ctx.runQuery as any)(
        internal.messages.listInternal as any,
        {
          conversationId: args.conversationId,
        },
      );

      // Apply smart truncation
      const truncated = truncateMessages(messages, 16000);

      if (truncated.length === 0) return;

      // Format as conversation history
      const conversationText = formatConversation(truncated);

      // Generate title with full context
      const result = streamText({
        model: aiGateway(TITLE_MODEL.id),
        prompt: `${CONVERSATION_TITLE_PROMPT}

Conversation:
${conversationText}`,
        providerOptions: getGatewayOptions(TITLE_MODEL.id, undefined, [
          "title-generation",
        ]),
      });

      let title = "";
      for await (const chunk of result.textStream) {
        title += chunk;
      }

      // Update conversation title
      await ctx.runMutation(internal.conversations.updateTitle, {
        conversationId: args.conversationId,
        title: title.trim(),
      });
    } catch (error) {
      console.error("Title generation failed:", error);
      // Keep default title on failure
    }
  },
});
