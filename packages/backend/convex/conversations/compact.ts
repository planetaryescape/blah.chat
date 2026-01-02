"use node";

import { generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { SUMMARIZATION_MODEL } from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/utils";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import {
  buildCompactionPrompt,
  CONVERSATION_COMPACTION_PROMPT,
} from "../lib/prompts/operational/conversationCompaction";

/**
 * Compact a conversation by summarizing it and creating a new conversation
 * with the summary as the first assistant message.
 */
export const compact = action({
  args: {
    conversationId: v.id("conversations"),
    targetModel: v.optional(v.string()),
  },
  returns: v.object({ conversationId: v.id("conversations") }),
  handler: async (
    ctx,
    args,
  ): Promise<{ conversationId: Id<"conversations"> }> => {
    // Get current user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    )) as Doc<"users"> | null;

    if (!user) throw new Error("Not authenticated");

    // Get source conversation
    const conversation = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.conversations.getInternal,
      { id: args.conversationId },
    )) as Doc<"conversations"> | null;

    if (!conversation) throw new Error("Conversation not found");
    if (conversation.userId !== user._id) throw new Error("Not authorized");

    // Get all messages from conversation
    const messages =
      ((await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.messages.listInternal,
        { conversationId: args.conversationId },
      )) as Doc<"messages">[]) || [];

    if (messages.length < 3) {
      throw new Error("Conversation too short to compact");
    }

    // Filter to only complete messages
    const completeMessages = messages.filter((m) => m.status === "complete");

    // Build transcript for summarization
    const transcript = completeMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    // Truncate if too long (16k chars like title generation)
    const truncatedTranscript = transcript.slice(0, 16000);

    // Generate summary using LLM
    const result = await generateText({
      model: getModel(SUMMARIZATION_MODEL.id),
      system: CONVERSATION_COMPACTION_PROMPT,
      prompt: buildCompactionPrompt(truncatedTranscript),
      temperature: 0.7,
      providerOptions: getGatewayOptions(SUMMARIZATION_MODEL.id, undefined, [
        "conversation-compaction",
      ]),
    });

    const summary = result.text.trim();

    // Track usage
    if (result.usage) {
      const inputTokens = result.usage.inputTokens ?? 0;
      const outputTokens = result.usage.outputTokens ?? 0;
      const cost = calculateCost(SUMMARIZATION_MODEL.id, {
        inputTokens,
        outputTokens,
      });

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.usage.mutations.recordTextGeneration,
        {
          userId: user._id,
          conversationId: args.conversationId,
          model: SUMMARIZATION_MODEL.id,
          inputTokens,
          outputTokens,
          cost,
          feature: "chat",
        },
      );
    }

    // Create new conversation with target model (or same model)
    const targetModel = args.targetModel || conversation.model;

    const newConversationId = (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.conversations.createInternal,
      {
        userId: user._id,
        model: targetModel,
        title: `${conversation.title} (continued)`,
      },
    )) as Id<"conversations">;

    // Insert summary as first assistant message
    // Note: messages.create auto-increments conversation.messageCount
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.messages.create,
      {
        conversationId: newConversationId,
        userId: user._id,
        role: "assistant",
        content: `**Recap from previous conversation:**\n\n${summary}`,
        status: "complete",
        model: targetModel,
      },
    );

    return { conversationId: newConversationId };
  },
});
