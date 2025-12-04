import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const generateTitle = internalAction({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    try {
      // Get first 2 messages (user + assistant)
      const messages = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });

      const userMsg = messages.find(m => m.role === "user");
      const assistantMsg = messages.find(m => m.role === "assistant" && m.status === "complete");

      if (!userMsg || !assistantMsg) return;

      // Generate title with grok-4-fast
      const result = streamText({
        model: openrouter("x-ai/grok-4-fast"),
        prompt: `Generate a 3-5 word title for this conversation.

User: ${userMsg.content}
Assistant: ${assistantMsg.content.substring(0, 300)}...

Title (no quotes):`,
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
