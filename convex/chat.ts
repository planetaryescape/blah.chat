import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCurrentUserOrCreate } from "./lib/userSync";

export const sendMessage = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
    modelId: v.optional(v.string()),
    thinkingEffort: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ conversationId: Id<"conversations">; messageId: Id<"messages"> }> => {
    const user = await getCurrentUserOrCreate(ctx);

    // Use provided model or user's default
    const modelId = args.modelId || user.preferences.defaultModel;

    // 1. Get or create conversation
    let conversationId = args.conversationId;
    if (!conversationId) {
      conversationId = await ctx.runMutation(internal.conversations.createInternal, {
        userId: user._id,
        model: modelId,
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
      model: modelId,
    });

    // 4. Schedule generation action (non-blocking)
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId,
      assistantMessageId,
      modelId,
      thinkingEffort: args.thinkingEffort,
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

    const user = await getCurrentUserOrCreate(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) throw new Error("Conversation not found");

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

    // Priority: message.model → conversation.model → user.preferences.defaultModel
    const modelId = message.model || conversation.model || user.preferences.defaultModel;

    // Create new pending assistant message
    const newMessageId: Id<"messages"> = await ctx.runMutation(internal.messages.create, {
      conversationId: message.conversationId,
      role: "assistant",
      status: "pending",
      model: modelId,
    });

    // Schedule generation
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: message.conversationId,
      assistantMessageId: newMessageId,
      modelId,
    });

    // Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId: message.conversationId,
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

    // Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId: args.conversationId,
    });
  },
});

export const branchFromMessage = mutation({
  args: {
    messageId: v.id("messages"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"conversations">> => {
    const user = await getCurrentUserOrCreate(ctx);
    const sourceMessage = await ctx.db.get(args.messageId);
    if (!sourceMessage) throw new Error("Message not found");

    // Get source conversation
    const sourceConversation = await ctx.db.get(sourceMessage.conversationId);
    if (!sourceConversation || sourceConversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Get all messages up to and including the branch point
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", sourceMessage.conversationId)
      )
      .collect();

    // Sort by createdAt and filter messages up to branch point
    const sortedMessages = allMessages.sort((a, b) => a.createdAt - b.createdAt);
    const branchIndex = sortedMessages.findIndex((m) => m._id === args.messageId);
    const messagesToCopy = sortedMessages.slice(0, branchIndex + 1);

    // Create new conversation
    const newConversationId = await ctx.runMutation(internal.conversations.createInternal, {
      userId: user._id,
      model: sourceConversation.model,
      title: args.title || `Branch from: ${sourceConversation.title}`,
    });

    // Copy messages to new conversation
    for (const message of messagesToCopy) {
      await ctx.runMutation(internal.messages.create, {
        conversationId: newConversationId,
        role: message.role,
        content: message.content,
        status: "complete", // All copied messages are complete
        model: message.model,
      });
    }

    return newConversationId;
  },
});
