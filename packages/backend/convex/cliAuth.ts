/**
 * CLI API Key Authentication
 *
 * Handles API key generation, validation, and revocation for CLI clients.
 * Keys are hashed (SHA-256) before storage - plaintext never stored in DB.
 *
 * Uses Web Crypto API (works in Convex runtime, no "use node" needed)
 */

import { v } from "convex/values";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (local, not exported)
// ─────────────────────────────────────────────────────────────────────────────

function generateApiKey(): string {
  // Format: blah_<24 random base64url chars> = 29 chars total
  // Use Web Crypto API (works in Convex runtime)
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  // Convert to base64url
  const base64 = btoa(String.fromCharCode(...bytes));
  const base64url = base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `blah_${base64url}`;
}

async function hashKey(key: string): Promise<string> {
  // Use Web Crypto API for SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Helper to get current user (duplicated to avoid type depth issues)
async function getCurrentUserFromCtx(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
  db: any;
}): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List user's active CLI keys (for settings page)
 * Returns only non-revoked keys with safe display fields
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserFromCtx(ctx);
    if (!user) return [];

    const keys = await ctx.db
      .query("cliApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Return only non-revoked, hide sensitive fields
    return keys
      .filter((k) => !k.revokedAt)
      .map((k) => ({
        _id: k._id,
        keyPrefix: k.keyPrefix,
        name: k.name,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      }));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Public Mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create new CLI API key (called from /cli-login page)
 * Returns plaintext key ONCE - never stored in DB
 */
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserFromCtx(ctx);
    if (!user) throw new Error("Not authenticated");

    const key = generateApiKey();
    const keyHash = await hashKey(key);
    const keyPrefix = `${key.slice(0, 12)}...`;

    await ctx.db.insert("cliApiKeys", {
      userId: user._id,
      keyHash,
      keyPrefix,
      name: `CLI Login - ${formatDate(Date.now())}`,
      createdAt: Date.now(),
    });

    // Return plaintext key ONCE (never stored in DB)
    return {
      key,
      keyPrefix,
      email: user.email,
      name: user.name,
    };
  },
});

/**
 * Revoke a CLI API key
 */
export const revoke = mutation({
  args: { keyId: v.id("cliApiKeys") },
  handler: async (ctx, { keyId }) => {
    const user = await getCurrentUserFromCtx(ctx);
    if (!user) throw new Error("Not authenticated");

    const apiKey = await ctx.db.get(keyId);
    if (!apiKey || apiKey.userId !== user._id) {
      throw new Error("Key not found");
    }

    await ctx.db.patch(keyId, { revokedAt: Date.now() });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Internal Queries (for CLI validation - called without Clerk auth)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate API key hash and return user info
 * Used by CLI to validate stored API key on each session
 */
export const validateKeyHash = internalQuery({
  args: { keyHash: v.string() },
  handler: async (ctx, { keyHash }) => {
    const apiKey = await ctx.db
      .query("cliApiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", keyHash))
      .first();

    if (!apiKey || apiKey.revokedAt) return null;

    const user = await ctx.db.get(apiKey.userId);
    if (!user) return null;

    // Note: Can't update lastUsedAt in internalQuery (read-only)
    // Would need separate mutation scheduled from here

    return {
      userId: user._id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
    };
  },
});

/**
 * Public query to validate API key (for CLI to call without auth)
 * Takes the raw key, hashes it, and validates
 */
export const validate = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    // Hash the key for lookup
    const keyHash = await hashKey(key);

    const apiKey = await ctx.db
      .query("cliApiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", keyHash))
      .first();

    if (!apiKey || apiKey.revokedAt) return null;

    const user = await ctx.db.get(apiKey.userId);
    if (!user) return null;

    // Note: Can't update lastUsedAt in query (read-only)
    // Would need separate mutation for this

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI-Specific Queries (Public, authenticate via API key)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper to validate API key and get user
 */
async function validateAndGetUser(
  ctx: { db: any },
  apiKey: string,
): Promise<Doc<"users"> | null> {
  const keyHash = await hashKey(apiKey);
  const key = await ctx.db
    .query("cliApiKeys")
    .withIndex("by_key_hash", (q: any) => q.eq("keyHash", keyHash))
    .first();

  if (!key || key.revokedAt) return null;

  const user = await ctx.db.get(key.userId);
  if (!user) return null;

  // Note: Can't update lastUsedAt in queries (read-only)
  // For mutations, we'll need to pass db writer context

  return user;
}

/**
 * Helper to validate API key and get user (for mutations - can write)
 */
async function validateAndGetUserForMutation(
  ctx: { db: any },
  apiKey: string,
): Promise<Doc<"users"> | null> {
  const keyHash = await hashKey(apiKey);
  const key = await ctx.db
    .query("cliApiKeys")
    .withIndex("by_key_hash", (q: any) => q.eq("keyHash", keyHash))
    .first();

  if (!key || key.revokedAt) return null;

  const user = await ctx.db.get(key.userId);
  if (!user) return null;

  // Update lastUsedAt for mutations
  await ctx.db.patch(key._id, { lastUsedAt: Date.now() });

  return user;
}

/**
 * List conversations for CLI (public, API key auth)
 */
export const listConversations = query({
  args: { apiKey: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { apiKey, limit = 50 }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return conversations.map((c) => ({
      _id: c._id,
      title: c.title,
      model: c.model,
      pinned: c.pinned,
      messageCount: c.messageCount,
      lastMessageAt: c.lastMessageAt,
      createdAt: c._creationTime,
    }));
  },
});

/**
 * Get conversation for CLI (public, API key auth)
 */
export const getConversation = query({
  args: { apiKey: v.string(), conversationId: v.id("conversations") },
  handler: async (ctx, { apiKey, conversationId }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== user._id) return null;

    return {
      _id: conversation._id,
      title: conversation.title,
      model: conversation.model,
      pinned: conversation.pinned,
      messageCount: conversation.messageCount,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation._creationTime,
    };
  },
});

/**
 * List messages for CLI (public, API key auth)
 */
export const listMessages = query({
  args: { apiKey: v.string(), conversationId: v.id("conversations") },
  handler: async (ctx, { apiKey, conversationId }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    // Verify conversation ownership
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== user._id) return null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .order("asc")
      .collect();

    return messages.map((m) => ({
      _id: m._id,
      role: m.role,
      content: m.content,
      partialContent: m.partialContent,
      status: m.status,
      error: m.error,
      createdAt: m._creationTime,
      // Model + stats for display
      model: m.model,
      inputTokens: m.inputTokens,
      outputTokens: m.outputTokens,
      tokensPerSecond: m.tokensPerSecond,
      firstTokenAt: m.firstTokenAt,
      generationStartedAt: m.generationStartedAt,
    }));
  },
});

/**
 * Send message for CLI (public mutation, API key auth)
 */
export const sendMessage = mutation({
  args: {
    apiKey: v.string(),
    conversationId: v.id("conversations"),
    content: v.string(),
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, { apiKey, conversationId, content, modelId }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    // Verify conversation ownership
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const now = Date.now();

    // Create user message
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      role: "user",
      content,
      status: "complete",
      createdAt: now,
      updatedAt: now,
    });

    const effectiveModel = modelId || conversation.model || "openai:gpt-5-mini";

    // Update conversation (count +1 for user, assistant added in action)
    await ctx.db.patch(conversationId, {
      lastMessageAt: now,
      messageCount: (conversation.messageCount || 0) + 1,
      model: modelId || conversation.model,
      updatedAt: now,
    });

    // Schedule generation action (creates assistant message)
    await ctx.scheduler.runAfter(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.generation.generateResponse,
      {
        userId: user._id,
        modelId: effectiveModel,
        conversationId,
        thinkingEffort: "medium",
      },
    );

    return {
      userMessageId: messageId,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI Conversation Management (Public, API key auth)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new conversation for CLI
 */
export const createConversation = mutation({
  args: {
    apiKey: v.string(),
    title: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { apiKey, title, model }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      title: title || "New Chat",
      model: model || "openai:gpt-5-mini",
      pinned: false,
      archived: false,
      starred: false,
      messageCount: 0,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { conversationId };
  },
});

/**
 * Archive a conversation for CLI (soft delete)
 */
export const archiveConversation = mutation({
  args: {
    apiKey: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { apiKey, conversationId }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(conversationId, {
      archived: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a conversation and all its messages for CLI (hard delete)
 */
export const deleteConversation = mutation({
  args: {
    apiKey: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { apiKey, conversationId }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    // Delete all messages first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the conversation
    await ctx.db.delete(conversationId);

    return { success: true };
  },
});

/**
 * Update conversation model for CLI
 */
export const updateConversationModel = mutation({
  args: {
    apiKey: v.string(),
    conversationId: v.id("conversations"),
    model: v.string(),
  },
  handler: async (ctx, { apiKey, conversationId, model }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(conversationId, {
      model,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Rename conversation for CLI
 */
export const renameConversation = mutation({
  args: {
    apiKey: v.string(),
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, { apiKey, conversationId, title }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(conversationId, {
      title,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Create a bookmark for a message (CLI)
 */
export const createBookmark = mutation({
  args: {
    apiKey: v.string(),
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { apiKey, messageId, conversationId, note }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    // Verify message exists and belongs to user's conversation
    const message = await ctx.db.get(messageId);
    if (!message || message.conversationId !== conversationId) {
      throw new Error("Message not found");
    }

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    // Check if bookmark already exists
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_message", (q) =>
        q.eq("userId", user._id).eq("messageId", messageId),
      )
      .first();

    if (existing) {
      return { bookmarkId: existing._id };
    }

    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId: user._id,
      messageId,
      conversationId,
      note: note || undefined,
      tags: [],
      createdAt: Date.now(),
    });

    return { bookmarkId };
  },
});

/**
 * List available models for CLI
 * Returns models from actual MODEL_CONFIG (excludes internal/experimental)
 */
export const listModels = query({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    // Provider display names
    const providerNames: Record<string, string> = {
      openai: "OpenAI",
      anthropic: "Anthropic",
      google: "Google",
      xai: "xAI",
      perplexity: "Perplexity",
      groq: "Groq",
      cerebras: "Cerebras",
      minimax: "MiniMax",
      deepseek: "DeepSeek",
      kimi: "Kimi",
      zai: "Z.ai",
      meta: "Meta",
      mistral: "Mistral",
      alibaba: "Alibaba",
      zhipu: "ZhiPu",
    };

    // Return models from actual MODEL_CONFIG
    return Object.values(MODEL_CONFIG)
      .filter((model) => !model.isInternalOnly && !model.isExperimental)
      .map((model) => ({
        id: model.id,
        name: model.name,
        provider: providerNames[model.provider] || model.provider,
        isPro: model.isPro ?? false,
      }));
  },
});

/**
 * Get user's default model for new chats
 * Returns user preference or system default
 */
export const getUserDefaultModel = query({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    // Get user preference
    const preference = await ctx.db
      .query("userPreferences")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", user._id).eq("key", "defaultModel"),
      )
      .first();

    // Return preference or system default
    return preference?.value || "openai:gpt-5-mini";
  },
});

/**
 * Search conversations by title for CLI
 */
export const searchConversations = query({
  args: {
    apiKey: v.string(),
    searchQuery: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { apiKey, searchQuery, limit = 20 }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    // Get all conversations and filter client-side
    // (Convex search index requires specific setup)
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.neq(q.field("archived"), true))
      .order("desc")
      .collect();

    // Simple case-insensitive title search
    const query = searchQuery.toLowerCase();
    const filtered = conversations
      .filter((c) => c.title?.toLowerCase().includes(query))
      .slice(0, limit);

    return filtered.map((c) => ({
      _id: c._id,
      title: c.title,
      model: c.model,
      pinned: c.pinned,
      messageCount: c.messageCount,
      lastMessageAt: c.lastMessageAt,
      createdAt: c._creationTime,
    }));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature Queries (Memories, Projects, Bookmarks, Templates)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List user's memories for CLI/Raycast
 */
export const listMemories = query({
  args: { apiKey: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { apiKey, limit = 50 }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return memories.map((m) => ({
      _id: m._id,
      content: m.content,
      category: m.metadata.category,
      importance: m.metadata.importance,
      createdAt: m.createdAt,
    }));
  },
});

/**
 * List user's projects for CLI/Raycast
 */
export const listProjects = query({
  args: { apiKey: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { apiKey, limit = 50 }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return projects.map((p) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
    }));
  },
});

/**
 * List user's bookmarks for CLI/Raycast
 */
export const listBookmarks = query({
  args: { apiKey: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { apiKey, limit = 50 }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    // Fetch associated message content for preview
    const results = await Promise.all(
      bookmarks.map(async (b) => {
        const message = await ctx.db.get(b.messageId);
        return {
          _id: b._id,
          messageId: b.messageId,
          conversationId: b.conversationId,
          note: b.note,
          tags: b.tags,
          messagePreview: message?.content?.slice(0, 200),
          createdAt: b.createdAt,
        };
      }),
    );

    return results;
  },
});

/**
 * List templates for CLI/Raycast (user's + built-in public)
 */
export const listTemplates = query({
  args: { apiKey: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { apiKey, limit = 50 }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    // Get user's templates
    const userTemplates = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    // Get built-in public templates
    const builtInTemplates = await ctx.db
      .query("templates")
      .filter((q) =>
        q.and(
          q.eq(q.field("isBuiltIn"), true),
          q.eq(q.field("isPublic"), true),
        ),
      )
      .order("desc")
      .take(limit);

    // Combine and dedupe (user templates take priority)
    const allTemplates = [...userTemplates, ...builtInTemplates].slice(
      0,
      limit,
    );

    return allTemplates.map((t) => ({
      _id: t._id,
      name: t.name,
      prompt: t.prompt,
      description: t.description,
      category: t.category,
      isBuiltIn: t.isBuiltIn,
      usageCount: t.usageCount,
      createdAt: t.createdAt,
    }));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Tasks API (CLI/Raycast)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List user's tasks for CLI/Raycast
 */
export const listTasks = query({
  args: {
    apiKey: v.string(),
    status: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { apiKey, status, limit = 50 }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    const tasksQuery = ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id));

    const tasks = await tasksQuery.order("desc").take(limit);

    // Filter by status if provided
    const filtered = status ? tasks.filter((t) => t.status === status) : tasks;

    return filtered.map((t) => ({
      _id: t._id,
      title: t.title,
      description: t.description,
      status: t.status,
      urgency: t.urgency,
      deadline: t.deadline,
      deadlineSource: t.deadlineSource,
      projectId: t.projectId,
      tags: t.tags,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      completedAt: t.completedAt,
    }));
  },
});

/**
 * Create a task (CLI)
 */
export const createTask = mutation({
  args: {
    apiKey: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    urgency: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
    deadline: v.optional(v.number()),
    deadlineSource: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { apiKey, ...args }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    // Validate project ownership if provided
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== user._id) {
        throw new Error("Project not found");
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      userId: user._id,
      title: args.title,
      description: args.description,
      status: "confirmed",
      urgency: args.urgency,
      deadline: args.deadline,
      deadlineSource: args.deadlineSource,
      sourceType: "manual",
      projectId: args.projectId,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule embedding generation
    // @ts-ignore - Type depth exceeded
    await ctx.scheduler.runAfter(
      0,
      internal.tasks.embeddings.generateEmbedding,
      {
        taskId,
      },
    );

    return { taskId };
  },
});

/**
 * Update a task (CLI)
 */
export const updateTask = mutation({
  args: {
    apiKey: v.string(),
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    urgency: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
    deadline: v.optional(v.number()),
  },
  handler: async (ctx, { apiKey, taskId, ...updates }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    const patch: any = { ...updates, updatedAt: Date.now() };

    // Track completion time
    if (updates.status === "completed" && task.status !== "completed") {
      patch.completedAt = Date.now();
    }

    await ctx.db.patch(taskId, patch);
  },
});

/**
 * Complete a task (CLI shortcut)
 */
export const completeTask = mutation({
  args: {
    apiKey: v.string(),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, { apiKey, taskId }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(taskId, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a task (CLI)
 */
export const deleteTask = mutation({
  args: {
    apiKey: v.string(),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, { apiKey, taskId }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    // Delete associated task tags
    const taskTags = await ctx.db
      .query("taskTags")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();

    for (const tag of taskTags) {
      await ctx.db.delete(tag._id);
    }

    await ctx.db.delete(taskId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Notes API (CLI/Raycast)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List user's notes for CLI/Raycast
 */
export const listNotes = query({
  args: {
    apiKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { apiKey, limit = 50 }) => {
    const user = await validateAndGetUser(ctx, apiKey);
    if (!user) return null;

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    // Sort pinned to top
    const sorted = [...notes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    return sorted.map((n) => ({
      _id: n._id,
      title: n.title,
      content: n.content,
      isPinned: n.isPinned,
      projectId: n.projectId,
      tags: n.tags,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));
  },
});

/**
 * Create a note (CLI)
 */
export const createCliNote = mutation({
  args: {
    apiKey: v.string(),
    content: v.string(),
    title: v.optional(v.string()),
    sourceMessageId: v.optional(v.id("messages")),
    sourceConversationId: v.optional(v.id("conversations")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { apiKey, ...args }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    // Validate source conversation if provided
    if (args.sourceConversationId) {
      const conversation = await ctx.db.get(args.sourceConversationId);
      if (!conversation || conversation.userId !== user._id) {
        throw new Error("Conversation not found");
      }
    }

    // Validate project if provided
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== user._id) {
        throw new Error("Project not found");
      }
    }

    // Extract title from content if not provided
    const title = args.title || extractTitleFromContent(args.content);

    const noteId = await ctx.db.insert("notes", {
      userId: user._id,
      title,
      content: args.content,
      htmlContent: args.content, // Basic conversion, web app handles proper rendering
      sourceMessageId: args.sourceMessageId,
      sourceConversationId: args.sourceConversationId,
      projectId: args.projectId,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule embedding generation
    // @ts-ignore - Type depth exceeded
    await ctx.scheduler.runAfter(
      0,
      internal.notes.embeddings.generateEmbedding,
      {
        noteId,
      },
    );

    return { noteId };
  },
});

/**
 * Update a note (CLI)
 */
export const updateCliNote = mutation({
  args: {
    apiKey: v.string(),
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, { apiKey, noteId, ...updates }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    const note = await ctx.db.get(noteId);
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found");
    }

    const patch: any = { ...updates, updatedAt: Date.now() };

    // Auto-update title from content if content changed but title not provided
    if (updates.content && !updates.title) {
      patch.title = extractTitleFromContent(updates.content);
    }

    // Update htmlContent if content changed
    if (updates.content) {
      patch.htmlContent = updates.content;
    }

    await ctx.db.patch(noteId, patch);

    // Regenerate embedding if content changed
    if (updates.content) {
      // @ts-ignore - Type depth exceeded
      await ctx.scheduler.runAfter(
        0,
        internal.notes.embeddings.generateEmbedding,
        {
          noteId,
        },
      );
    }
  },
});

/**
 * Delete a note (CLI)
 */
export const deleteCliNote = mutation({
  args: {
    apiKey: v.string(),
    noteId: v.id("notes"),
  },
  handler: async (ctx, { apiKey, noteId }) => {
    const user = await validateAndGetUserForMutation(ctx, apiKey);
    if (!user) throw new Error("Invalid or revoked API key");

    const note = await ctx.db.get(noteId);
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found");
    }

    // Delete associated note tags
    const noteTags = await ctx.db
      .query("noteTags")
      .withIndex("by_note", (q) => q.eq("noteId", noteId))
      .collect();

    for (const tag of noteTags) {
      await ctx.db.delete(tag._id);
    }

    await ctx.db.delete(noteId);
  },
});

// Helper to extract title from note content
function extractTitleFromContent(content: string): string {
  const lines = content.split("\n").filter((line) => line.trim());
  if (!lines.length) return "Untitled Note";

  const firstLine = lines[0];
  // Remove markdown heading syntax
  return (
    firstLine
      .replace(/^#+\s*/, "")
      .trim()
      .slice(0, 100) || "Untitled Note"
  );
}
