import { generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { TITLE_GENERATION_MODEL } from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { CONVERSATION_TITLE_PROMPT } from "../lib/prompts/operational/titleGeneration";

export const bulkAutoRename = action({
  args: {
    conversationIds: v.array(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    // biome-ignore lint/suspicious/noExplicitAny: Complex Convex type inference issues
    const results: any[] = [];

    // Process in batches of 5 to avoid rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < args.conversationIds.length; i += BATCH_SIZE) {
      const batch = args.conversationIds.slice(i, i + BATCH_SIZE);

      // biome-ignore lint/suspicious/noExplicitAny: Complex Convex type inference issues
      const batchPromises = batch.map(async (conversationId: any) => {
        try {
          // 1. Get messages to find context
          const messages = await (
            ctx.runQuery as (ref: any, args: any) => Promise<Doc<"messages">[]>
          )(internal.messages.listInternal as any, {
            conversationId,
          });

          // Find first user message
          const userMessage = messages.find((m) => m.role === "user");

          if (!userMessage) {
            return {
              id: conversationId,
              success: false,
              error: "No user message found",
            };
          }

          // 2. Generate title
          const result = await generateText({
            model: getModel(TITLE_GENERATION_MODEL.id),
            prompt: `${CONVERSATION_TITLE_PROMPT}

First user message:
${userMessage.content}`,
            temperature: 0.7,
            providerOptions: getGatewayOptions(
              TITLE_GENERATION_MODEL.id,
              undefined,
              ["title-generation"],
            ),
          });

          // Handle undefined result - use optional chaining for safety
          const rawText = result?.text;
          if (!rawText) {
            console.error(
              "AI Gateway returned no text for conversation",
              conversationId,
            );
            return {
              id: conversationId,
              success: false,
              error: "No title generated",
            };
          }

          const title: string = rawText
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
          // Log additional debug info for undefined text issue
          if (
            error instanceof Error &&
            error.message.includes("Cannot read properties of undefined")
          ) {
            console.error(
              "Debug info - result undefined error in title generation",
            );
          }
          return { id: conversationId, success: false, error: String(error) };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  },
});
