import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

export const bulkAutoRename = action({
  args: {
    conversationIds: v.array(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const results: any[] = [];

    // Process in batches of 5 to avoid rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < args.conversationIds.length; i += BATCH_SIZE) {
      const batch = args.conversationIds.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (conversationId: any) => {
        try {
          // 1. Get messages to find context
          const messages: any = await ctx.runQuery(
            internal.messages.listInternal,
            {
              conversationId,
            },
          );

          // Find first user message
          // @ts-ignore
          const userMessage = messages.find((m: any) => m.role === "user");

          if (!userMessage) {
            return {
              id: conversationId,
              success: false,
              error: "No user message found",
            };
          }

          // 2. Generate title
          const result: any = await generateText({
            model: groq("openai/gpt-oss-20b"),
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that generates concise, descriptive titles for conversations. Generate a title that captures the main topic. Max 6 words. Return ONLY the title text.",
              },
              {
                role: "user",
                content: `Generate a title for this conversation based on the first user message:\n\n${userMessage.content}`,
              },
            ],
            temperature: 0.7,
          });

          const title: string = result.text
            .trim()
            .replace(/^["']|["']$/g, "")
            .replace(/\.$/, "");

          // 3. Update title
          await ctx.runMutation(internal.conversations.updateTitle, {
            conversationId,
            title,
          });

          return { id: conversationId, success: true, title };
        } catch (error) {
          console.error(
            `Failed to rename conversation ${conversationId}:`,
            error,
          );
          return { id: conversationId, success: false, error: String(error) };
        }
      });

      const batchResults: any = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  },
});
