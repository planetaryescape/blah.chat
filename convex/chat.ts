import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCurrentUserOrCreate } from "./lib/userSync";

export const sendMessage = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
    modelId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ conversationId: Id<"conversations">; messageId: Id<"messages"> }> => {
    const user = await getCurrentUserOrCreate(ctx);

    // 1. Get or create conversation
    let conversationId = args.conversationId;
    if (!conversationId) {
      conversationId = await ctx.runMutation(internal.conversations.createInternal, {
        userId: user._id,
        model: args.modelId,
        title: "New Chat",
      });
    }

    // 2. Insert user message
    await ctx.runMutation(internal.messages.create, {
      conversationId,
      role: "user",
      content: args.content,
      status: "complete",
    });

    // 3. Insert pending assistant message
    const assistantMessageId = await ctx.runMutation(internal.messages.create, {
      conversationId,
      role: "assistant",
      status: "pending",
      model: args.modelId,
    });

    // 4. Schedule generation action (non-blocking)
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId,
      assistantMessageId,
      modelId: args.modelId,
    });

    // 5. Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId,
    });

    // 6. Return immediately
    return { conversationId, messageId: assistantMessageId };
  },
});

export const regenerate = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Delete this message + all following messages
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", message.conversationId))
      .order("asc")
      .collect();

    const index = allMessages.findIndex((m) => m._id === args.messageId);
    for (const msg of allMessages.slice(index)) {
      await ctx.db.delete(msg._id);
    }

    // Create new pending assistant message
    const newMessageId: Id<"messages"> = await ctx.runMutation(internal.messages.create, {
      conversationId: message.conversationId,
      role: "assistant",
      status: "pending",
      model: message.model || "openai:gpt-4o-mini",
    });

    // Schedule generation
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: message.conversationId,
      assistantMessageId: newMessageId,
      modelId: message.model || "openai:gpt-4o-mini",
    });

    return newMessageId;
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.messageId);
  },
});

export const stopGeneration = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find generating message
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(5);

    const generatingMsg = messages.find((m) => m.status && ["generating", "pending"].includes(m.status));

    if (generatingMsg) {
      await ctx.db.patch(generatingMsg._id, {
        content: generatingMsg.partialContent || "",
        partialContent: undefined,
        status: "complete",
        generationCompletedAt: Date.now(),
      });
    }
  },
});
