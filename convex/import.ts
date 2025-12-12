import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { getCurrentUserOrCreate } from "./lib/userSync";

const importMessageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
  createdAt: v.optional(v.number()),
  model: v.optional(v.string()),
});

const importConversationValidator = v.object({
  title: v.string(),
  messages: v.array(importMessageValidator),
  model: v.optional(v.string()),
  systemPrompt: v.optional(v.string()),
  createdAt: v.optional(v.number()),
});

export const importConversations = mutation({
  args: {
    conversations: v.array(importConversationValidator),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    importedCount: number;
    conversationIds: Id<"conversations">[];
    error?: string;
  }> => {
    const user = await getCurrentUserOrCreate(ctx);

    const conversationIds: Id<"conversations">[] = [];
    let importedCount = 0;

    try {
      for (const conv of args.conversations) {
        // Create conversation
        const conversationId: Id<"conversations"> = await ctx.runMutation(
          internal.conversations.createInternal,
          {
            userId: user._id,
            model: conv.model || "openai:gpt-4o-mini",
            title: conv.title,
            systemPrompt: conv.systemPrompt,
          },
        );

        // Create messages
        for (const msg of conv.messages) {
          await ctx.runMutation(internal.messages.create, {
            conversationId,
            userId: user._id,
            role: msg.role,
            content: msg.content,
            status: "complete",
            model: msg.model || (msg.role === "assistant" ? conv.model || "openai:gpt-4o-mini" : undefined),
          });
        }

        // Update conversation stats
        await ctx.db.patch(conversationId, {
          messageCount: conv.messages.length,
          lastMessageAt: conv.createdAt || Date.now(),
        });

        conversationIds.push(conversationId);
        importedCount++;
      }

      return {
        success: true,
        importedCount,
        conversationIds,
      };
    } catch (error) {
      return {
        success: false,
        importedCount,
        conversationIds,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during import",
      };
    }
  },
});
