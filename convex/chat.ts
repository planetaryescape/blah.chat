import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { getCurrentUserOrCreate } from "./lib/userSync";
import { MODEL_CONFIG } from "@/lib/ai/models";

const attachmentValidator = v.object({
  type: v.union(v.literal("file"), v.literal("image"), v.literal("audio")),
  name: v.string(),
  storageId: v.string(),
  mimeType: v.string(),
  size: v.number(),
});

/**
 * Check if model is expensive enough to warrant triage analysis
 * Threshold: $5/M average cost catches truly expensive models
 */
function shouldAnalyzeModelFit(modelId: string): boolean {
  const model = MODEL_CONFIG[modelId];
  if (!model) return false;

  const avgCost = (model.pricing.input + model.pricing.output) / 2;
  return avgCost >= 5.0; // Expensive threshold
}

export const sendMessage = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
    modelId: v.optional(v.string()), // Single model (backwards compat)
    models: v.optional(v.array(v.string())), // NEW: Array for comparison
    thinkingEffort: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    conversationId: Id<"conversations">;
    messageId?: Id<"messages">; // Single mode
    assistantMessageIds?: Id<"messages">[]; // Comparison mode
    comparisonGroupId?: string;
  }> => {
    const user = await getCurrentUserOrCreate(ctx);

    // PRE-FLIGHT CHECKS

    // 1. Check daily message limit from admin settings
    const adminSettings = await ctx.db.query("adminSettings").first();
    const dailyLimit = adminSettings?.defaultDailyMessageLimit ?? 50;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    if (user.lastMessageDate !== today) {
      // Reset counter for new day
      await ctx.db.patch(user._id, {
        dailyMessageCount: 0,
        lastMessageDate: today,
      });
      user.dailyMessageCount = 0;
    }

    if ((user.dailyMessageCount || 0) >= dailyLimit) {
      throw new Error("Daily message limit reached. Come back tomorrow!");
    }

    // 2. Check budget (if hard limit enabled)
    const budgetHardLimit = adminSettings?.budgetHardLimitEnabled ?? true;
    const monthlyBudget = adminSettings?.defaultMonthlyBudget ?? 10;

    if (budgetHardLimit && monthlyBudget > 0) {
      // Get current month's spending
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const records = await ctx.db
        .query("usageRecords")
        .withIndex("by_user_date", (q) => q.eq("userId", user._id))
        .filter((q) => q.gte(q.field("date"), monthStart))
        .collect();

      const totalSpend = records.reduce((sum, r) => sum + r.cost, 0);

      if (totalSpend >= monthlyBudget) {
        throw new Error(
          `Monthly budget of $${monthlyBudget} exceeded. You've spent $${totalSpend.toFixed(2)} this month.`,
        );
      }
    }

    // Phase 4: Get default model from new preference system
    const defaultModel = await (
      ctx.runQuery as (ref: any, args: any) => Promise<string | null>
    )(api.users.getUserPreference as any, { key: "defaultModel" });

    // Determine models to use (fallback to openai:gpt-4o-mini)
    const modelsToUse = args.models || [
      args.modelId || defaultModel || "openai:gpt-4o-mini",
    ];

    // Generate comparison group ID if multiple models
    const comparisonGroupId =
      modelsToUse.length > 1 ? crypto.randomUUID() : undefined;

    // 3. Get or create conversation
    let conversationId = args.conversationId;
    if (!conversationId) {
      conversationId = await ctx.runMutation(
        internal.conversations.createInternal,
        {
          userId: user._id,
          model: modelsToUse[0], // Primary model
          title: "New Chat",
        },
      );
    }

    // 4. Insert user message (single)
    await ctx.runMutation(internal.messages.create, {
      conversationId,
      userId: user._id,
      role: "user",
      content: args.content,
      attachments: args.attachments,
      status: "complete",
      comparisonGroupId, // Link to comparison group if multi-model
    });

    // 5. Insert N pending assistant messages
    const assistantMessageIds: Id<"messages">[] = [];

    for (const model of modelsToUse) {
      const msgId = await ctx.runMutation(internal.messages.create, {
        conversationId,
        userId: user._id,
        role: "assistant",
        status: "pending",
        model,
        comparisonGroupId, // Link all responses
      });
      assistantMessageIds.push(msgId);

      // 6. Schedule generation action (non-blocking)
      await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
        conversationId,
        assistantMessageId: msgId,
        modelId: model,
        userId: user._id,
        // biome-ignore lint/suspicious/noExplicitAny: Thinking effort type casting
        thinkingEffort: args.thinkingEffort as any,
      });
    }

    // 7. Trigger model recommendation triage (if expensive model used)
    if (conversationId && shouldAnalyzeModelFit(modelsToUse[0])) {
      await ctx.scheduler.runAfter(
        0, // Immediate, non-blocking
        internal.ai.modelTriage.analyzeModelFit,
        {
          conversationId,
          userMessage: args.content,
          currentModelId: modelsToUse[0],
        },
      );
    }

    // 8. Increment daily message count
    await ctx.db.patch(user._id, {
      dailyMessageCount: (user.dailyMessageCount || 0) + 1,
    });

    // 9. Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId,
    });

    // 10. Check if memory extraction should trigger (auto-extraction)
    if (conversationId) {
      // Get global admin settings for memory extraction
      const adminSettings = await ctx.db.query("adminSettings").first();
      const autoExtractEnabled =
        adminSettings?.autoMemoryExtractEnabled ?? true;
      const interval = adminSettings?.autoMemoryExtractInterval ?? 5;

      if (autoExtractEnabled) {
        // Count user messages (turns) in this conversation
        const userMessageCount = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversationId),
          )
          .filter((q) => q.eq(q.field("role"), "user"))
          .collect()
          .then((msgs) => msgs.length);

        // Trigger extraction if we've hit the interval (30s debounce)
        if (userMessageCount > 0 && userMessageCount % interval === 0) {
          await ctx.scheduler.runAfter(
            30 * 1000, // 30 seconds debounce
            internal.memories.extract.extractMemories,
            {
              conversationId,
            },
          );
        }
      }
    }

    // 11. Return immediately
    return {
      // biome-ignore lint/style/noNonNullAssertion: conversationId is guaranteed to exist at this point
      conversationId: conversationId!,
      messageId: modelsToUse.length === 1 ? assistantMessageIds[0] : undefined,
      assistantMessageIds:
        modelsToUse.length > 1 ? assistantMessageIds : undefined,
      comparisonGroupId,
    };
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

    // Branch-preserving regenerate: Create sibling instead of deleting
    // Find parent message to create new sibling at same level
    const parentMessageId = message.parentMessageId;

    // Get all existing siblings (messages with same parent)
    const siblings = await ctx.db
      .query("messages")
      .withIndex("by_parent", (q) =>
        parentMessageId
          ? q.eq("parentMessageId", parentMessageId)
          : q.eq("parentMessageId", undefined),
      )
      .filter((q) => q.eq(q.field("conversationId"), message.conversationId))
      .collect();

    // Calculate next branch index
    const maxBranchIndex = siblings.reduce(
      (max, msg) => Math.max(max, msg.branchIndex ?? 0),
      0,
    );
    const nextBranchIndex = maxBranchIndex + 1;

    // Generate branch label
    const branchLabel = `Regeneration ${nextBranchIndex}`;

    // Phase 4: Get default model from new preference system
    const userDefaultModel = await (
      ctx.runQuery as (ref: any, args: any) => Promise<string | null>
    )(api.users.getUserPreference as any, { key: "defaultModel" });

    // Priority: message.model → conversation.model → user defaultModel preference → fallback
    const modelId =
      message.model ||
      conversation.model ||
      userDefaultModel ||
      "openai:gpt-4o-mini";

    // Create new pending assistant message as sibling
    const newMessageId: Id<"messages"> = await ctx.runMutation(
      internal.messages.create,
      {
        conversationId: message.conversationId,
        userId: conversation.userId,
        role: "assistant",
        status: "pending",
        model: modelId,
        parentMessageId: parentMessageId, // Same parent as original
        branchIndex: nextBranchIndex,
        branchLabel: branchLabel,
      },
    );

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

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await ctx.db.delete(args.messageId);

    // Decrement conversation messageCount
    const conversation = await ctx.db.get(message.conversationId);
    if (conversation?.messageCount && conversation.messageCount > 0) {
      await ctx.db.patch(message.conversationId, {
        messageCount: conversation.messageCount - 1,
      });
    }
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
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(5);

    const generatingMsg = messages.find(
      (m) => m.status && ["generating", "pending"].includes(m.status),
    );

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

export const retryMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await getCurrentUserOrCreate(ctx);
    const userMessage = await ctx.db.get(args.messageId);
    if (!userMessage) throw new Error("Message not found");
    if (userMessage.role !== "user") {
      throw new Error("Can only retry user messages");
    }

    const conversation = await ctx.db.get(userMessage.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Find failed AI message (next message after user message)
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", userMessage.conversationId),
      )
      .order("asc")
      .collect();

    const userIndex = allMessages.findIndex((m) => m._id === args.messageId);
    const aiMessage = allMessages[userIndex + 1];

    if (!aiMessage) throw new Error("No message to retry");
    if (aiMessage.status !== "error") {
      throw new Error("Can only retry failed messages");
    }

    // Delete failed AI message + all following messages
    const deletedCount = allMessages.slice(userIndex + 1).length;
    for (const msg of allMessages.slice(userIndex + 1)) {
      await ctx.db.delete(msg._id);
    }

    // Decrement messageCount by deleted count
    const conv = await ctx.db.get(userMessage.conversationId);
    if (conv && deletedCount > 0) {
      await ctx.db.patch(userMessage.conversationId, {
        messageCount: Math.max(0, (conv.messageCount || 0) - deletedCount),
      });
    }

    // Phase 4: Get default model from new preference system
    const userDefaultModel2 = await (
      ctx.runQuery as (ref: any, args: any) => Promise<string | null>
    )(api.users.getUserPreference as any, { key: "defaultModel" });

    // Priority: aiMessage.model → conversation.model → user defaultModel preference → fallback
    const modelId =
      aiMessage.model ||
      conversation.model ||
      userDefaultModel2 ||
      "openai:gpt-4o-mini";

    // Create new pending assistant message
    const newMessageId: Id<"messages"> = await ctx.runMutation(
      internal.messages.create,
      {
        conversationId: userMessage.conversationId,
        userId: conversation.userId,
        role: "assistant",
        status: "pending",
        model: modelId,
      },
    );

    // Schedule generation
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: userMessage.conversationId,
      assistantMessageId: newMessageId,
      modelId,
      userId: conversation.userId,
    });

    // Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId: userMessage.conversationId,
    });

    return newMessageId;
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
        q.eq("conversationId", sourceMessage.conversationId),
      )
      .collect();

    // Sort by createdAt and filter messages up to branch point
    const sortedMessages = allMessages.sort(
      (a, b) => a.createdAt - b.createdAt,
    );
    const branchIndex = sortedMessages.findIndex(
      (m) => m._id === args.messageId,
    );
    const messagesToCopy = sortedMessages.slice(0, branchIndex + 1);

    // Create new conversation with parent references
    const newConversationId = await ctx.runMutation(
      internal.conversations.createInternal,
      {
        userId: user._id,
        model: sourceConversation.model,
        title: args.title || sourceConversation.title,
        parentConversationId: sourceMessage.conversationId,
        parentMessageId: args.messageId,
      },
    );

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
