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

    // PRE-FLIGHT CHECKS

    // 1. Check daily message limit
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    if (user.lastMessageDate !== today) {
      // Reset counter for new day
      await ctx.db.patch(user._id, {
        dailyMessageCount: 0,
        lastMessageDate: today,
      });
      user.dailyMessageCount = 0;
    }

    const dailyLimit = user.dailyMessageLimit || 50;
    if ((user.dailyMessageCount || 0) >= dailyLimit) {
      throw new Error("Daily message limit reached. Come back tomorrow!");
    }

    // 2. Check budget (if enabled)
    // TODO: Re-enable budget check after convex schema migration

    // Use provided model or user's default
    const modelId = args.modelId || user.preferences.defaultModel;

    // 3. Get or create conversation
    let conversationId = args.conversationId;
    if (!conversationId) {
      conversationId = await ctx.runMutation(internal.conversations.createInternal, {
        userId: user._id,
        model: modelId,
        title: "New Chat",
      });
    }

    // 4. Insert user message
    await ctx.runMutation(internal.messages.create, {
      conversationId,
      userId: user._id,
      role: "user",
      content: args.content,
      status: "complete",
    });

    // 5. Insert pending assistant message
    const assistantMessageId = await ctx.runMutation(internal.messages.create, {
      conversationId,
      userId: user._id,
      role: "assistant",
      status: "pending",
      model: modelId,
    });

    // 6. Schedule generation action (non-blocking)
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId,
      assistantMessageId,
      modelId,
      userId: user._id,
      thinkingEffort: args.thinkingEffort,
    });

    // 7. Increment daily message count
    await ctx.db.patch(user._id, {
      dailyMessageCount: (user.dailyMessageCount || 0) + 1,
    });

    // 8. Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId,
    });

    // 9. Check if memory extraction should trigger (auto-extraction)
    if (conversationId && user.preferences?.autoMemoryExtractEnabled !== false) {
      const interval = user.preferences?.autoMemoryExtractInterval || 5;

      // Count messages in this conversation
      const messageCount = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect()
        .then((msgs) => msgs.length);

      // Trigger extraction if we've hit the interval
      if (messageCount > 0 && messageCount % interval === 0) {
        await ctx.scheduler.runAfter(0, internal.memories.extract.extractMemories, {
          conversationId,
        });
      }
    }

    // 10. Return immediately
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
      userId: conversation.userId,
      role: "assistant",
      status: "pending",
      model: modelId,
    });

    // Schedule generation
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: message.conversationId,
      assistantMessageId: newMessageId,
      modelId,
      userId: conversation.userId,
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
        userId: user._id,
        role: message.role,
        content: message.content,
        status: "complete", // All copied messages are complete
        model: message.model,
      });
    }

    return newConversationId;
  },
});
