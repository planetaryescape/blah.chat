import { v } from "convex/values";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation } from "./_generated/server";
import { getCurrentUserOrCreate } from "./lib/userSync";

/**
 * Check if user can access a conversation
 * Returns true if user is owner OR participant (for collaborative)
 */
async function canAccessConversation(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
): Promise<boolean> {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) return false;

  // Owner always has access
  if (conversation.userId === userId) return true;

  // Check participant table for collaborative conversations
  if (conversation.isCollaborative) {
    const participant = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", userId).eq("conversationId", conversationId),
      )
      .first();

    return participant !== null;
  }

  return false;
}

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
      v.union(
        v.literal("none"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
      ),
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

    // Determine models to use - client MUST provide modelId, fallback only for edge cases
    const modelsToUse = args.models || [args.modelId || "openai:gpt-oss-20b"];

    // Pro model enforcement (follows presentations.ts:87-115 pattern)
    const hasProModel = modelsToUse.some((modelId) => {
      const model = MODEL_CONFIG[modelId];
      return (
        model?.isPro === true ||
        (model?.pricing?.input ?? 0) >= 5 ||
        (model?.pricing?.output ?? 0) >= 15
      );
    });

    if (hasProModel && !user.isAdmin) {
      const adminSettings = await ctx.db.query("adminSettings").first();

      if (!adminSettings?.proModelsEnabled) {
        throw new Error("Pro models are currently disabled");
      }

      const tier = user.tier || "free";
      if (tier === "free") {
        throw new Error("Upgrade your account to access pro models");
      }

      const today = new Date().toISOString().split("T")[0];

      if (tier === "tier1") {
        const dailyLimit = adminSettings.tier1DailyProModelLimit ?? 1;
        if (dailyLimit > 0) {
          let currentCount = user.dailyProModelCount ?? 0;
          if (user.lastProModelDate !== today) currentCount = 0;
          if (currentCount >= dailyLimit) {
            throw new Error(
              `Daily pro model limit reached (${dailyLimit} per day). Try again tomorrow.`,
            );
          }
          await ctx.db.patch(user._id, {
            dailyProModelCount: currentCount + 1,
            lastProModelDate: today,
          });
        }
      }

      if (tier === "tier2") {
        const thisMonth = today.substring(0, 7);
        const monthlyLimit = adminSettings.tier2MonthlyProModelLimit ?? 50;
        if (monthlyLimit > 0) {
          let currentCount = user.monthlyProModelCount ?? 0;
          if (user.lastProModelMonth !== thisMonth) currentCount = 0;
          if (currentCount >= monthlyLimit) {
            throw new Error(
              `Monthly pro model limit reached (${monthlyLimit} per month). Try again next month.`,
            );
          }
          await ctx.db.patch(user._id, {
            monthlyProModelCount: currentCount + 1,
            lastProModelMonth: thisMonth,
          });
        }
      }
    }

    // FAST PATH: Minimal blocking operations for snappy UX
    // Limit checks and housekeeping are deferred to background mutation

    // Generate comparison group ID if multiple models
    const comparisonGroupId =
      modelsToUse.length > 1 ? crypto.randomUUID() : undefined;

    // 3. Get or create conversation
    let conversationId = args.conversationId;
    if (!conversationId) {
      conversationId = await ctx.runMutation(
        // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
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
        // @ts-ignore
        internal.ai.modelTriage.analyzeModelFit,
        {
          conversationId,
          userMessage: args.content,
          currentModelId: modelsToUse[0],
        },
      );
    }

    // 8. Schedule background housekeeping (non-blocking)
    // This handles: daily count, timestamp update, limit checks, memory extraction
    await ctx.scheduler.runAfter(0, internal.chat.runHousekeeping, {
      userId: user._id,
      conversationId: conversationId!,
    });

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

/**
 * Background housekeeping mutation - runs after message is sent
 * Handles non-critical operations that shouldn't block the user:
 * - Daily message count increment
 * - Conversation timestamp update
 * - Soft limit checking (flags user if exceeded)
 * - Memory extraction trigger
 */
export const runHousekeeping = internalMutation({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    // 1. Increment daily message count (handle day reset)
    const currentCount =
      user.lastMessageDate === today ? user.dailyMessageCount || 0 : 0;

    await ctx.db.patch(args.userId, {
      dailyMessageCount: currentCount + 1,
      lastMessageDate: today,
    });

    // 2. Update conversation timestamp
    // @ts-ignore
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId: args.conversationId,
    });

    // 3. Check if limits exceeded (soft check - for analytics/flagging)
    const adminSettings = await ctx.runQuery(
      internal.adminSettings.getWithEnvOverrides,
    );
    const dailyLimit = adminSettings.defaultDailyMessageLimit;

    if (currentCount + 1 >= dailyLimit) {
      // User will be blocked on next message, but current one goes through
      // Could add analytics tracking here if desired
    }

    // 4. Check if memory extraction should trigger (auto-extraction)
    // Skip for incognito conversations - they don't save memories
    const conversation = await ctx.db.get(args.conversationId);
    const autoExtractEnabled = adminSettings?.autoMemoryExtractEnabled ?? true;
    const interval = adminSettings?.autoMemoryExtractInterval ?? 5;

    if (autoExtractEnabled && !conversation?.isIncognito) {
      // Use conversation's messageCount for efficient check (avoid full query)
      const messageCount = conversation?.messageCount || 0;

      // Approximate user message count as ~half of total messages
      // This is a heuristic to avoid the expensive query
      const estimatedUserMessages = Math.floor(messageCount / 2);

      if (estimatedUserMessages > 0 && estimatedUserMessages % interval === 0) {
        await ctx.scheduler.runAfter(
          30 * 1000, // 30 seconds debounce
          internal.memories.extract.extractMemories,
          {
            conversationId: args.conversationId,
          },
        );
      }
    }

    // 5. Record activity for incognito conversations (resets deletion timer)
    if (conversation?.isIncognito) {
      await ctx.scheduler.runAfter(0, internal.incognito.recordActivity, {
        conversationId: args.conversationId,
      });
    }
  },
});

export const regenerate = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const _user = await getCurrentUserOrCreate(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Verify it's an assistant message
    if (message.role !== "assistant") {
      throw new Error("Can only regenerate assistant messages");
    }

    // Phase 4: Get default model from new preference system
    const userDefaultModel = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserPreference,
      { key: "defaultModel" },
    )) as string | null;

    // Priority: message.model → conversation.model → user defaultModel preference → fallback
    const modelId =
      message.model ||
      conversation.model ||
      userDefaultModel ||
      "openai:gpt-oss-20b";

    // Reset the message in-place (replace, not create sibling)
    await ctx.db.patch(args.messageId, {
      content: "",
      status: "pending",
      model: modelId,
      partialContent: undefined,
      reasoning: undefined,
      thinkingStartedAt: undefined,
      thinkingCompletedAt: undefined,
      updatedAt: Date.now(),
    });

    // Delete any existing tool calls for this message
    const existingToolCalls = await ctx.db
      .query("toolCalls")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
    for (const tc of existingToolCalls) {
      await ctx.db.delete(tc._id);
    }

    // Delete any existing sources for this message
    const existingSources = await ctx.db
      .query("sources")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
    for (const src of existingSources) {
      await ctx.db.delete(src._id);
    }

    // Schedule generation
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: message.conversationId,
      assistantMessageId: args.messageId,
      modelId,
      userId: conversation.userId,
    });

    // Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId: message.conversationId,
    });

    return args.messageId;
  },
});

export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Verify ownership
    if (conversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Only allow editing user messages
    if (message.role !== "user") {
      throw new Error("Can only edit user messages");
    }

    // Update message content
    await ctx.db.patch(args.messageId, {
      content: args.content,
      updatedAt: Date.now(),
    });

    // Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId: message.conversationId,
    });
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Security: Verify user can access this conversation
    const hasAccess = await canAccessConversation(
      ctx,
      message.conversationId,
      user._id,
    );
    if (!hasAccess) throw new Error("Unauthorized");

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
    const user = await getCurrentUserOrCreate(ctx);

    // Security: Verify user can access this conversation
    const hasAccess = await canAccessConversation(
      ctx,
      args.conversationId,
      user._id,
    );
    if (!hasAccess) throw new Error("Unauthorized");

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
        status: "stopped",
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

    const _user = await getCurrentUserOrCreate(ctx);
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
      "openai:gpt-oss-20b";

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
