import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, query } from "../_generated/server";

// Job type definitions
export const jobTypes = v.union(
  v.literal("search"),
  v.literal("extractMemories"),
  v.literal("transcribe"),
  v.literal("embedFile"),
  v.literal("analyzeVideo"),
);

export const jobStatus = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

/**
 * Create new job (internal - called by action wrappers)
 */
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    type: jobTypes,
    input: v.any(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { userId, type, input, metadata }) => {
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24h default for pending/running

    return await ctx.db.insert("jobs", {
      userId,
      type,
      status: "pending",
      input,
      metadata,
      createdAt: now,
      expiresAt,
      retryCount: 0,
    });
  },
});

/**
 * Update job status (internal)
 */
export const updateStatus = internalMutation({
  args: {
    jobId: v.id("jobs"),
    status: jobStatus,
    result: v.optional(v.any()),
    error: v.optional(
      v.object({
        message: v.string(),
        code: v.optional(v.string()),
        details: v.optional(v.any()),
      }),
    ),
    progress: v.optional(
      v.object({
        current: v.number(),
        message: v.string(),
        eta: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { jobId, status, result, error, progress }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Job not found");

    const updates: Partial<Doc<"jobs">> = { status };

    if (status === "running" && !job.startedAt) {
      updates.startedAt = Date.now();
    }

    if (status === "completed" || status === "failed") {
      updates.completedAt = Date.now();

      // Update expiration based on final status
      if (status === "completed") {
        updates.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      } else {
        updates.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
      }
    }

    if (result !== undefined) updates.result = result;
    if (error !== undefined) updates.error = error;
    if (progress !== undefined) updates.progress = progress;

    await ctx.db.patch(jobId, updates);
  },
});

/**
 * Get job by ID (public - for polling)
 */
export const getById = query({
  args: { id: v.id("jobs") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const job = await ctx.db.get(id);
    if (!job) return null;

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (job.userId !== user?._id) throw new Error("Forbidden");

    return job;
  },
});

/**
 * List recent jobs (for debugging/history)
 */
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(jobTypes),
    status: v.optional(jobStatus),
  },
  handler: async (ctx, { limit = 20, type, status }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const query = ctx.db
      .query("jobs")
      .withIndex("by_user", (q) => q.eq("userId", user._id));

    const jobs = await query.order("desc").take(limit);

    return jobs.filter((j) => {
      if (type && j.type !== type) return false;
      if (status && j.status !== status) return false;
      return true;
    });
  },
});

/**
 * Cleanup expired jobs (cron)
 */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("jobs")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(100); // Batch delete

    for (const job of expired) {
      await ctx.db.delete(job._id);
    }

    return { deleted: expired.length };
  },
});
