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

// Minimal message shape for fast inference (client sends, server skips DB fetch)
const _inferenceMessageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  model: v.optional(v.string()),
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
    userMessageId: Id<"messages">;
    assistantMessageIds: Id<"messages">[];
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

    // 4. Acquire lock BEFORE creating messages (prevents reactive query race condition)
    const lockAcquired = (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.generationLock.acquireLock,
      {
        conversationId,
        userId: user._id,
        comparisonGroupId,
        modelCount: modelsToUse.length,
      },
    )) as boolean;

    if (!lockAcquired) {
      throw new Error("Please wait for the current response to complete.");
    }

    // 5. Create messages and schedule generations - release lock on any failure
    // Each ctx.runMutation is atomic independently, NOT together as a transaction.
    // If message creation fails after lock acquired, we must explicitly release.
    let userMessageId: Id<"messages">;
    const assistantMessageIds: Id<"messages">[] = [];

    try {
      // Get tree context: find last message and root for tree fields
      const existingMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_created", (q) =>
          q.eq("conversationId", conversationId!),
        )
        .collect();

      // Sort by createdAt to find last message
      const sortedMessages = existingMessages.sort(
        (a, b) => a.createdAt - b.createdAt,
      );
      const lastMessage = sortedMessages[sortedMessages.length - 1];
      const rootMessageId =
        sortedMessages[0]?.rootMessageId ?? sortedMessages[0]?._id;

      // Insert user message (single) - only after lock acquired
      userMessageId = (await ctx.runMutation(internal.messages.create, {
        conversationId,
        userId: user._id,
        role: "user",
        content: args.content,
        attachments: args.attachments,
        status: "complete",
        comparisonGroupId, // Link to comparison group if multi-model
        // Tree fields (P7)
        parentMessageIds: lastMessage ? [lastMessage._id] : undefined,
        siblingIndex: 0,
        isActiveBranch: true,
        rootMessageId: rootMessageId,
      })) as Id<"messages">;

      // Create assistant messages upfront with status: "pending"
      // This eliminates client-side optimistic messages and deduplication
      for (let i = 0; i < modelsToUse.length; i++) {
        const model = modelsToUse[i];
        const assistantMessageId = (await ctx.runMutation(
          internal.messages.create,
          {
            conversationId,
            userId: user._id,
            role: "assistant",
            content: "",
            status: "pending",
            model,
            comparisonGroupId,
            // Tree fields (P7)
            parentMessageIds: [userMessageId],
            siblingIndex: i, // Multiple models = siblings
            isActiveBranch: i === 0, // First model is active branch
            rootMessageId: rootMessageId ?? userMessageId, // userMessage is root if first
            forkReason: modelsToUse.length > 1 ? "model_compare" : undefined,
          },
        )) as Id<"messages">;
        assistantMessageIds.push(assistantMessageId);
      }

      // 6. Schedule generation actions with existing message IDs
      for (let i = 0; i < modelsToUse.length; i++) {
        await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
          conversationId,
          existingMessageId: assistantMessageIds[i],
          modelId: modelsToUse[i],
          userId: user._id,
          thinkingEffort: args.thinkingEffort as any,
          comparisonGroupId,
        });
      }

      // 7. Trigger model recommendation triage (if expensive model used, skip if auto-selected or comparing)
      if (
        conversationId &&
        modelsToUse[0] !== "auto" &&
        !comparisonGroupId &&
        shouldAnalyzeModelFit(modelsToUse[0])
      ) {
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
    } catch (error) {
      // Release lock on any failure (message creation or scheduling)
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.lib.generationLock.forceReleaseLock,
        { conversationId },
      );
      throw error;
    }

    // 9. Return immediately with all message IDs
    return {
      conversationId: conversationId!,
      userMessageId,
      assistantMessageIds,
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
  args: {
    messageId: v.id("messages"),
    modelId: v.optional(v.string()),
    /** Pass failed models from error recovery to exclude them from retry */
    useFailedModelsFromMessage: v.optional(v.boolean()),
  },
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

    // Priority: explicit modelId → message.model → conversation.model → user defaultModel preference → fallback
    const modelId =
      args.modelId ||
      message.model ||
      conversation.model ||
      userDefaultModel ||
      "openai:gpt-oss-20b";

    // P7 Tree Architecture: Create sibling message instead of replacing in-place
    // This preserves the original response and enables branch navigation
    const parentIds =
      message.parentMessageIds ??
      (message.parentMessageId ? [message.parentMessageId] : undefined);

    // Get sibling index (count existing siblings)
    let siblingIndex = 0;
    if (parentIds && parentIds.length > 0) {
      const siblings = await ctx.db
        .query("messages")
        .withIndex("by_parent", (q) => q.eq("parentMessageId", parentIds[0]))
        .collect();
      siblingIndex = siblings.length;
    }

    // Mark original message as not on active branch
    await ctx.db.patch(args.messageId, {
      isActiveBranch: false,
      updatedAt: Date.now(),
    });

    // Create new sibling message
    const newMessageId = (await ctx.runMutation(internal.messages.create, {
      conversationId: message.conversationId,
      userId: conversation.userId,
      role: "assistant",
      content: "",
      status: "pending",
      model: modelId,
      comparisonGroupId: message.comparisonGroupId,
      // Tree fields (P7)
      parentMessageIds: parentIds,
      siblingIndex,
      isActiveBranch: true,
      rootMessageId: message.rootMessageId,
      forkReason: "regenerate",
    })) as Id<"messages">;

    // Get excluded models if retrying from error
    const excludedModels = args.useFailedModelsFromMessage
      ? message.failedModels
      : undefined;

    // Schedule generation with new message
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: message.conversationId,
      existingMessageId: newMessageId,
      modelId,
      userId: conversation.userId,
      excludedModels,
    });

    // Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId: message.conversationId,
    });

    // Increment branch count if set
    if (conversation.branchCount !== undefined) {
      await ctx.db.patch(conversation._id, {
        branchCount: (conversation.branchCount || 1) + 1,
      });
    }

    return newMessageId;
  },
});

export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    /** If true, creates a sibling branch and triggers new AI response (default: true) */
    createBranch: v.optional(v.boolean()),
    /** Model to use for the new response (only used when createBranch is true) */
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"messages"> | undefined> => {
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

    // Default to creating a branch (tree architecture)
    const shouldCreateBranch = args.createBranch !== false;

    if (!shouldCreateBranch) {
      // Simple in-place edit (for typo fixes without new response)
      await ctx.db.patch(args.messageId, {
        content: args.content,
        updatedAt: Date.now(),
      });

      await ctx.runMutation(internal.conversations.updateLastMessageAt, {
        conversationId: message.conversationId,
      });
      return;
    }

    // P7 Tree Architecture: Create sibling message with edited content
    // This preserves the original branch and creates a new path

    // Get parent info for sibling creation
    const parentIds =
      message.parentMessageIds ??
      (message.parentMessageId ? [message.parentMessageId] : undefined);

    // Get sibling index (count existing siblings with same parent)
    let siblingIndex = 0;
    if (parentIds && parentIds.length > 0) {
      const siblings = await ctx.db
        .query("messages")
        .withIndex("by_parent", (q) => q.eq("parentMessageId", parentIds[0]))
        .collect();
      siblingIndex = siblings.length;
    } else {
      // Root message - count other root messages
      const rootSiblings = await ctx.db
        .query("messages")
        .withIndex("by_conversation_created", (q) =>
          q.eq("conversationId", message.conversationId),
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("parentMessageId"), undefined),
            q.eq(q.field("parentMessageIds"), undefined),
          ),
        )
        .collect();
      siblingIndex = rootSiblings.length;
    }

    // Mark original message as not on active branch
    await ctx.db.patch(args.messageId, {
      isActiveBranch: false,
      updatedAt: Date.now(),
    });

    // Create new sibling with edited content
    const newUserMessageId = (await ctx.runMutation(internal.messages.create, {
      conversationId: message.conversationId,
      userId: user._id,
      role: "user",
      content: args.content,
      status: "complete",
      // Tree fields (P7)
      parentMessageIds: parentIds,
      siblingIndex,
      isActiveBranch: true,
      rootMessageId: message.rootMessageId ?? message._id,
      forkReason: "edit",
      forkMetadata: {
        originalContent: message.content,
        branchedAt: Date.now(),
        branchedBy: user._id,
      },
    })) as Id<"messages">;

    // Get model for new response
    const userDefaultModel = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserPreference,
      { key: "defaultModel" },
    )) as string | null;

    const modelId =
      args.modelId ||
      conversation.model ||
      userDefaultModel ||
      "openai:gpt-oss-20b";

    // Create pending assistant message
    const newAssistantMessageId = (await ctx.runMutation(
      internal.messages.create,
      {
        conversationId: message.conversationId,
        userId: user._id,
        role: "assistant",
        content: "",
        status: "pending",
        model: modelId,
        // Tree fields (P7)
        parentMessageIds: [newUserMessageId],
        siblingIndex: 0,
        isActiveBranch: true,
        rootMessageId: message.rootMessageId ?? message._id,
      },
    )) as Id<"messages">;

    // Update conversation with new active leaf
    await ctx.db.patch(conversation._id, {
      activeLeafMessageId: newAssistantMessageId,
      branchCount: (conversation.branchCount || 1) + 1,
      updatedAt: Date.now(),
    });

    // Schedule generation for the new response
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: message.conversationId,
      existingMessageId: newAssistantMessageId,
      modelId,
      userId: user._id,
    });

    // Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId: message.conversationId,
    });

    return newUserMessageId;
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

    // Schedule generation (action creates message)
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: userMessage.conversationId,
      modelId,
      userId: conversation.userId,
    });

    // Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId: userMessage.conversationId,
    });

    // Note: message ID not available here - created in action
    return userMessage._id; // Return user message ID as reference
  },
});

/**
 * P7 Tree Architecture: Branch from a message without copying
 *
 * Sets up the conversation to branch from a specific message.
 * The next message sent will create a new branch from this point.
 *
 * Returns the conversation ID (same as before) and branch info.
 */
export const branchFromMessage = mutation({
  args: {
    messageId: v.id("messages"),
    title: v.optional(v.string()), // Unused in tree architecture, kept for API compat
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    conversationId: Id<"conversations">;
    branchPointId: Id<"messages">;
    existingSiblings: number;
  }> => {
    const user = await getCurrentUserOrCreate(ctx);
    const branchPoint = await ctx.db.get(args.messageId);
    if (!branchPoint) throw new Error("Message not found");

    // Get conversation
    const conversation = await ctx.db.get(branchPoint.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Count existing children (siblings in new branch)
    const existingChildren = await ctx.db
      .query("messages")
      .withIndex("by_parent", (q) => q.eq("parentMessageId", args.messageId))
      .collect();

    // Mark the path from branch point to current leaf as inactive
    // (The new branch will be active)
    const activePath = await ctx.db
      .query("messages")
      .withIndex("by_conversation_active", (q) =>
        q.eq("conversationId", conversation._id).eq("isActiveBranch", true),
      )
      .collect();

    // Find messages after the branch point and mark them inactive
    const branchPointTime = branchPoint.createdAt;
    for (const msg of activePath) {
      if (msg.createdAt > branchPointTime) {
        await ctx.db.patch(msg._id, {
          isActiveBranch: false,
          updatedAt: Date.now(),
        });
      }
    }

    // Update conversation to point to branch point as active leaf
    await ctx.db.patch(conversation._id, {
      activeLeafMessageId: args.messageId,
      branchCount: (conversation.branchCount ?? 1) + 1,
      updatedAt: Date.now(),
    });

    return {
      conversationId: conversation._id,
      branchPointId: args.messageId,
      existingSiblings: existingChildren.length,
    };
  },
});

/**
 * Legacy: Create a new conversation by copying messages up to branch point
 * DEPRECATED: Use branchFromMessage for in-conversation branching (P7)
 */
export const branchToNewConversation = mutation({
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

    // Copy messages to new conversation (with tree fields)
    let rootMessageId: Id<"messages"> | undefined;
    let previousMessageId: Id<"messages"> | undefined;

    for (const message of messagesToCopy) {
      const newMsgId = (await ctx.runMutation(internal.messages.create, {
        conversationId: newConversationId,
        userId: user._id,
        role: message.role,
        content: message.content,
        status: "complete",
        model: message.model,
        // Tree fields
        parentMessageIds: previousMessageId ? [previousMessageId] : undefined,
        siblingIndex: 0,
        isActiveBranch: true,
        rootMessageId: rootMessageId,
      })) as Id<"messages">;

      if (!rootMessageId) {
        rootMessageId = newMsgId;
        // Update the root message to point to itself
        await ctx.db.patch(newMsgId, { rootMessageId: newMsgId });
      }
      previousMessageId = newMsgId;
    }

    return newConversationId;
  },
});

/**
 * P7 Tree Architecture: Switch to a different branch
 *
 * Changes which branch is displayed by updating isActiveBranch flags
 * and the conversation's activeLeafMessageId.
 */
export const switchBranch = mutation({
  args: {
    conversationId: v.id("conversations"),
    targetMessageId: v.id("messages"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    activeLeafId: Id<"messages">;
    pathLength: number;
  }> => {
    const user = await getCurrentUserOrCreate(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const targetMessage = await ctx.db.get(args.targetMessageId);
    if (
      !targetMessage ||
      targetMessage.conversationId !== args.conversationId
    ) {
      throw new Error("Message not in conversation");
    }

    // Get all messages in conversation
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    // Build path to root from target message
    const pathToRootIds = new Set<string>();
    let currentId: Id<"messages"> | undefined = args.targetMessageId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      pathToRootIds.add(currentId);

      const msg = allMessages.find((m) => m._id === currentId);
      if (!msg) break;
      currentId = msg.parentMessageIds?.[0] ?? msg.parentMessageId;
    }

    // Find the leaf of the branch containing target message
    // Walk from target to its leaf (follow first child repeatedly)
    let leafMessage = targetMessage;
    const leafVisited = new Set<string>();

    while (true) {
      if (leafVisited.has(leafMessage._id)) break;
      leafVisited.add(leafMessage._id);

      // Find children of current message
      const children = allMessages.filter(
        (m) =>
          (m.parentMessageIds?.includes(leafMessage._id) ||
            m.parentMessageId === leafMessage._id) &&
          m._id !== leafMessage._id,
      );

      if (children.length === 0) break;

      // Follow the first child by siblingIndex
      const sortedChildren = children.sort(
        (a, b) => (a.siblingIndex ?? 0) - (b.siblingIndex ?? 0),
      );
      leafMessage = sortedChildren[0];
      pathToRootIds.add(leafMessage._id);
    }

    // Update isActiveBranch for all messages
    for (const msg of allMessages) {
      const shouldBeActive = pathToRootIds.has(msg._id);
      if (msg.isActiveBranch !== shouldBeActive) {
        await ctx.db.patch(msg._id, {
          isActiveBranch: shouldBeActive,
          updatedAt: Date.now(),
        });
      }
    }

    // Update conversation activeLeafMessageId
    await ctx.db.patch(args.conversationId, {
      activeLeafMessageId: leafMessage._id,
      updatedAt: Date.now(),
    });

    return {
      activeLeafId: leafMessage._id,
      pathLength: pathToRootIds.size,
    };
  },
});

/**
 * P7 Tree Architecture: Merge branches
 *
 * Creates a new message that combines multiple branches by having
 * multiple parent messages. This enables synthesizing insights from
 * different conversation paths.
 *
 * Use cases:
 * - Combine insights from two different AI model responses
 * - Merge edited branch back with original
 * - Synthesize multiple exploration paths
 */
export const mergeBranches = mutation({
  args: {
    conversationId: v.id("conversations"),
    /** Message IDs from different branches to merge */
    parentMessageIds: v.array(v.id("messages")),
    /** User message content that synthesizes/continues from merged branches */
    content: v.string(),
    /** Optional: trigger AI response after merge */
    generateResponse: v.optional(v.boolean()),
    /** Model to use for response (if generateResponse is true) */
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const user = await getCurrentUserOrCreate(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (args.parentMessageIds.length < 2) {
      throw new Error("Merge requires at least 2 parent messages");
    }

    // Verify all parent messages exist and belong to this conversation
    const parentMessages = await Promise.all(
      args.parentMessageIds.map((id) => ctx.db.get(id)),
    );

    for (let i = 0; i < parentMessages.length; i++) {
      const msg = parentMessages[i];
      if (!msg) {
        throw new Error(`Parent message ${args.parentMessageIds[i]} not found`);
      }
      if (msg.conversationId !== args.conversationId) {
        throw new Error(
          `Message ${args.parentMessageIds[i]} not in conversation`,
        );
      }
    }

    // Find common ancestor to get rootMessageId
    const firstParent = parentMessages[0]!;
    const rootMessageId = firstParent.rootMessageId ?? firstParent._id;

    // Create the merge user message
    const mergeMessageId = (await ctx.runMutation(internal.messages.create, {
      conversationId: args.conversationId,
      userId: user._id,
      role: "user",
      content: args.content,
      status: "complete",
      // Tree fields (P7) - multiple parents!
      parentMessageIds: args.parentMessageIds,
      siblingIndex: 0,
      isActiveBranch: true,
      rootMessageId,
      forkReason: "merge",
      forkMetadata: {
        mergedFromIds: args.parentMessageIds,
        branchedAt: Date.now(),
        branchedBy: user._id,
      },
    })) as Id<"messages">;

    // Mark all merged branches as not active (except path to root)
    // The new merge message becomes the active path
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    // Build new active path from merge message to root
    const activePath = new Set<string>();
    let currentId: Id<"messages"> | undefined = mergeMessageId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      activePath.add(currentId);

      const msg = allMessages.find((m) => m._id === currentId);
      if (!msg) break;
      // For merge messages, follow first parent
      currentId = msg.parentMessageIds?.[0] ?? msg.parentMessageId;
    }

    // Update isActiveBranch for all messages
    for (const msg of allMessages) {
      const shouldBeActive = activePath.has(msg._id);
      if (msg.isActiveBranch !== shouldBeActive) {
        await ctx.db.patch(msg._id, {
          isActiveBranch: shouldBeActive,
          updatedAt: Date.now(),
        });
      }
    }

    let activeLeafId = mergeMessageId;

    // Optionally generate AI response
    if (args.generateResponse !== false) {
      const userDefaultModel = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        api.users.getUserPreference,
        { key: "defaultModel" },
      )) as string | null;

      const modelId =
        args.modelId ||
        conversation.model ||
        userDefaultModel ||
        "openai:gpt-oss-20b";

      // Create pending assistant message
      const assistantMessageId = (await ctx.runMutation(
        internal.messages.create,
        {
          conversationId: args.conversationId,
          userId: user._id,
          role: "assistant",
          content: "",
          status: "pending",
          model: modelId,
          // Tree fields (P7)
          parentMessageIds: [mergeMessageId],
          siblingIndex: 0,
          isActiveBranch: true,
          rootMessageId,
        },
      )) as Id<"messages">;

      activeLeafId = assistantMessageId;

      // Schedule generation
      await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
        conversationId: args.conversationId,
        existingMessageId: assistantMessageId,
        modelId,
        userId: user._id,
      });
    }

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      activeLeafMessageId: activeLeafId,
      branchCount: Math.max(1, (conversation.branchCount || 1) - 1), // Merging reduces branch count
      updatedAt: Date.now(),
    });

    // Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId: args.conversationId,
    });

    return mergeMessageId;
  },
});
