import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/pricing";

export const generateResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    assistantMessageId: v.id("messages"),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Mark generation started
      await ctx.runMutation(internal.messages.updatePartialContent, {
        messageId: args.assistantMessageId,
        partialContent: "",
      });

      // 2. Get conversation history
      const messages = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });

      // 3. Filter to complete messages, exclude current pending message
      const history = messages
        .filter(
          (m: Doc<"messages">) => m._id !== args.assistantMessageId && m.status === "complete",
        )
        .map((m: Doc<"messages">) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content || "",
        }));

      // 4. Get model from registry
      const model = getModel(args.modelId);

      // 5. Stream from LLM
      const result = streamText({
        model,
        messages: history,
      });

      // 6. Accumulate chunks, throttle DB updates
      let accumulated = "";
      let lastUpdate = Date.now();
      const UPDATE_INTERVAL = 200; // ms

      for await (const chunk of result.textStream) {
        accumulated += chunk;

        const now = Date.now();
        if (now - lastUpdate >= UPDATE_INTERVAL) {
          await ctx.runMutation(internal.messages.updatePartialContent, {
            messageId: args.assistantMessageId,
            partialContent: accumulated,
          });
          lastUpdate = now;
        }
      }

      // 7. Get token usage
      const usage = await result.usage;

      // 8. Calculate cost
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;

      const cost = calculateCost(args.modelId, inputTokens, outputTokens);

      // 9. Final completion
      await ctx.runMutation(internal.messages.completeMessage, {
        messageId: args.assistantMessageId,
        content: accumulated,
        inputTokens,
        outputTokens,
        cost,
      });

      // 10. Update conversation timestamp
      await ctx.runMutation(internal.conversations.updateLastMessageAt, {
        conversationId: args.conversationId,
      });

      // 11. Auto-name after first AI response
      const allMessages = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });
      const assistantCount = allMessages.filter(m => m.role === "assistant").length;

      if (assistantCount === 1) {
        // First AI response, schedule title generation
        await ctx.scheduler.runAfter(0, internal.ai.generateTitle.generateTitle, {
          conversationId: args.conversationId,
        });
      }
    } catch (error) {
      await ctx.runMutation(internal.messages.markError, {
        messageId: args.assistantMessageId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});
