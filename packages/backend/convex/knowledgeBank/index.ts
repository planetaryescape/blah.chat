/**
 * Knowledge Bank CRUD Operations
 *
 * Manages knowledge sources (PDFs, text, web URLs, YouTube videos)
 * at both user-level (global) and project-level scopes.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

// Usage limits
export const KNOWLEDGE_BANK_LIMITS = {
  maxSourcesPerUser: 100,
  maxFileSizeMB: 50,
  maxTextChars: 100_000,
  maxChunksPerSource: 500,
  maxYouTubeMinutes: 120,
};

// Source type union
const sourceTypeValidator = v.union(
  v.literal("file"),
  v.literal("text"),
  v.literal("web"),
  v.literal("youtube"),
);

// ===== QUERIES =====

/**
 * List knowledge sources for current user
 */
export const list = query({
  args: {
    projectId: v.optional(v.id("projects")),
    type: v.optional(sourceTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const query = ctx.db
      .query("knowledgeSources")
      .withIndex("by_user", (q) => q.eq("userId", user._id));

    const sources = await query.collect();

    // Filter by projectId and type
    let filtered = sources.filter((s) => {
      if (args.projectId !== undefined) {
        // Project-specific: match exact projectId
        if (s.projectId !== args.projectId) return false;
      } else {
        // User-level only: no projectId
        if (s.projectId !== undefined) return false;
      }
      if (args.type && s.type !== args.type) return false;
      return true;
    });

    // Sort by createdAt descending
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

/**
 * Get a single knowledge source by ID
 */
export const get = query({
  args: {
    sourceId: v.id("knowledgeSources"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    const source = await ctx.db.get(args.sourceId);
    if (!source || source.userId !== user._id) return null;

    return source;
  },
});

/**
 * Get a knowledge source with all its chunks (for detail view)
 */
export const getSourceWithChunks = query({
  args: {
    sourceId: v.id("knowledgeSources"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    // Get source + verify ownership
    const source = await ctx.db.get(args.sourceId);
    if (!source || source.userId !== user._id) return null;

    // Get all chunks for this source
    const chunks = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .collect();

    // Sort by chunk index
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Return chunks WITHOUT embeddings (too large for frontend)
    const chunksWithoutEmbeddings = chunks.map((chunk) => ({
      _id: chunk._id,
      _creationTime: chunk._creationTime,
      sourceId: chunk.sourceId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      charOffset: chunk.charOffset,
      tokenCount: chunk.tokenCount,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      pageNumber: chunk.pageNumber,
    }));

    return {
      ...source,
      chunks: chunksWithoutEmbeddings,
    };
  },
});

/**
 * Get source count for limits checking (user-level only)
 */
export const getSourceCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return 0;

    const sources = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Count only user-level sources (no projectId) to match list view
    return sources.filter((s) => s.projectId === undefined).length;
  },
});

/**
 * Check if user has any completed knowledge sources (for system prompt)
 */
export const hasKnowledge = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Just check if at least one completed source exists
    const source = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .first();

    return source !== null;
  },
});

// ===== MUTATIONS =====

/**
 * Create a text knowledge source (pasted text)
 */
export const createTextSource = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    description: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Check limits
    if (args.content.length > KNOWLEDGE_BANK_LIMITS.maxTextChars) {
      throw new Error(
        `Text exceeds maximum length of ${KNOWLEDGE_BANK_LIMITS.maxTextChars} characters`,
      );
    }

    const sourceCount = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (sourceCount.length >= KNOWLEDGE_BANK_LIMITS.maxSourcesPerUser) {
      throw new Error(
        `Maximum of ${KNOWLEDGE_BANK_LIMITS.maxSourcesPerUser} sources allowed`,
      );
    }

    const now = Date.now();
    const sourceId = await ctx.db.insert("knowledgeSources", {
      userId: user._id,
      projectId: args.projectId,
      type: "text",
      title: args.title,
      description: args.description,
      rawContent: args.content,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule processing
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    await ctx.scheduler.runAfter(0, internal.knowledgeBank.process.processSource, {
      sourceId,
    });

    return sourceId;
  },
});

/**
 * Generate upload URL for knowledge bank files
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify user exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a file knowledge source
 */
export const createFileSource = mutation({
  args: {
    title: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    size: v.number(),
    description: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Check size limit
    const maxBytes = KNOWLEDGE_BANK_LIMITS.maxFileSizeMB * 1024 * 1024;
    if (args.size > maxBytes) {
      throw new Error(
        `File exceeds maximum size of ${KNOWLEDGE_BANK_LIMITS.maxFileSizeMB}MB`,
      );
    }

    // Check source count
    const sourceCount = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (sourceCount.length >= KNOWLEDGE_BANK_LIMITS.maxSourcesPerUser) {
      throw new Error(
        `Maximum of ${KNOWLEDGE_BANK_LIMITS.maxSourcesPerUser} sources allowed`,
      );
    }

    const now = Date.now();
    const sourceId = await ctx.db.insert("knowledgeSources", {
      userId: user._id,
      projectId: args.projectId,
      type: "file",
      title: args.title,
      description: args.description,
      storageId: args.storageId,
      mimeType: args.mimeType,
      size: args.size,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule processing
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    await ctx.scheduler.runAfter(0, internal.knowledgeBank.process.processSource, {
      sourceId,
    });

    return sourceId;
  },
});

/**
 * Create a web URL knowledge source
 */
export const createWebSource = mutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Basic URL validation
    try {
      new URL(args.url);
    } catch {
      throw new Error("Invalid URL");
    }

    // Check source count
    const sourceCount = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (sourceCount.length >= KNOWLEDGE_BANK_LIMITS.maxSourcesPerUser) {
      throw new Error(
        `Maximum of ${KNOWLEDGE_BANK_LIMITS.maxSourcesPerUser} sources allowed`,
      );
    }

    const now = Date.now();
    const sourceId = await ctx.db.insert("knowledgeSources", {
      userId: user._id,
      projectId: args.projectId,
      type: "web",
      title: args.title || args.url,
      description: args.description,
      url: args.url,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule processing
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    await ctx.scheduler.runAfter(0, internal.knowledgeBank.process.processSource, {
      sourceId,
    });

    return sourceId;
  },
});

/**
 * Create a YouTube video knowledge source
 */
export const createYouTubeSource = mutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Extract video ID from URL
    const videoId = extractYouTubeVideoId(args.url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    // Check source count
    const sourceCount = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (sourceCount.length >= KNOWLEDGE_BANK_LIMITS.maxSourcesPerUser) {
      throw new Error(
        `Maximum of ${KNOWLEDGE_BANK_LIMITS.maxSourcesPerUser} sources allowed`,
      );
    }

    const now = Date.now();
    const sourceId = await ctx.db.insert("knowledgeSources", {
      userId: user._id,
      projectId: args.projectId,
      type: "youtube",
      title: args.title || `YouTube: ${videoId}`,
      description: args.description,
      url: args.url,
      videoMetadata: {
        videoId,
      },
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule processing
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    await ctx.scheduler.runAfter(0, internal.knowledgeBank.process.processSource, {
      sourceId,
    });

    return sourceId;
  },
});

/**
 * Update a knowledge source
 */
export const update = mutation({
  args: {
    sourceId: v.id("knowledgeSources"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const source = await ctx.db.get(args.sourceId);
    if (!source || source.userId !== user._id) {
      throw new Error("Source not found");
    }

    await ctx.db.patch(args.sourceId, {
      ...(args.title && { title: args.title }),
      ...(args.description !== undefined && { description: args.description }),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a knowledge source and its chunks
 */
export const remove = mutation({
  args: {
    sourceId: v.id("knowledgeSources"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const source = await ctx.db.get(args.sourceId);
    if (!source || source.userId !== user._id) {
      throw new Error("Source not found");
    }

    // Delete all chunks
    const chunks = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Delete file from storage if applicable
    if (source.type === "file" && source.storageId) {
      await ctx.storage.delete(source.storageId);
    }

    // Delete source
    await ctx.db.delete(args.sourceId);
  },
});

/**
 * Reprocess a failed source
 */
export const reprocess = mutation({
  args: {
    sourceId: v.id("knowledgeSources"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const source = await ctx.db.get(args.sourceId);
    if (!source || source.userId !== user._id) {
      throw new Error("Source not found");
    }

    // Reset status
    await ctx.db.patch(args.sourceId, {
      status: "pending",
      error: undefined,
      updatedAt: Date.now(),
    });

    // Delete existing chunks
    const chunks = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Schedule reprocessing
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    await ctx.scheduler.runAfter(0, internal.knowledgeBank.process.processSource, {
      sourceId: args.sourceId,
    });
  },
});

// ===== INTERNAL =====

/**
 * Internal reprocess - for migrations and admin use
 */
export const reprocessInternal = internalMutation({
  args: {
    sourceId: v.id("knowledgeSources"),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new Error("Source not found");
    }

    // Reset status
    await ctx.db.patch(args.sourceId, {
      status: "pending",
      error: undefined,
      updatedAt: Date.now(),
    });

    // Delete existing chunks
    const chunks = await ctx.db
      .query("knowledgeChunks")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Schedule reprocessing
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    await ctx.scheduler.runAfter(0, internal.knowledgeBank.process.processSource, {
      sourceId: args.sourceId,
    });
  },
});

/**
 * Update source status (internal)
 */
export const updateStatus = internalMutation({
  args: {
    sourceId: v.id("knowledgeSources"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
    chunkCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, {
      status: args.status,
      error: args.error,
      chunkCount: args.chunkCount,
      processedAt: args.status === "completed" ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get source by ID (internal)
 */
export const getSource = internalQuery({
  args: {
    sourceId: v.id("knowledgeSources"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sourceId);
  },
});

/**
 * Insert knowledge chunk (internal)
 */
export const insertChunk = internalMutation({
  args: {
    sourceId: v.id("knowledgeSources"),
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    content: v.string(),
    chunkIndex: v.number(),
    charOffset: v.number(),
    tokenCount: v.number(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    pageNumber: v.optional(v.number()),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("knowledgeChunks", {
      sourceId: args.sourceId,
      userId: args.userId,
      projectId: args.projectId,
      content: args.content,
      chunkIndex: args.chunkIndex,
      charOffset: args.charOffset,
      tokenCount: args.tokenCount,
      startTime: args.startTime,
      endTime: args.endTime,
      pageNumber: args.pageNumber,
      embedding: args.embedding,
      createdAt: Date.now(),
    });
  },
});

// ===== HELPERS =====

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Debug: list all sources with errors (internal)
 */
export const debugListErrors = internalQuery({
  handler: async (ctx) => {
    const sources = await ctx.db.query("knowledgeSources").collect();
    return sources
      .filter((s) => s.status === "failed")
      .map((s) => ({
        id: s._id,
        title: s.title,
        type: s.type,
        error: s.error,
      }));
  },
});
