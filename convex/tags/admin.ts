/**
 * Tag Administration & Monitoring
 *
 * Utilities for monitoring auto-tagging system health and performance.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getCurrentUser } from "../lib/userSync";

/**
 * Get comprehensive tag metrics for monitoring
 *
 * Usage: Call from Convex dashboard or CLI
 * npx convex run tags/admin:getTagMetrics
 */
export const getTagMetrics = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.isAdmin) {
      throw new Error("Admin access required");
    }

    // Get all tags
    const allTags = await ctx.db.query("tags").collect();

    // Get all notes with tags
    const allNotes = await ctx.db.query("notes").collect();
    const notesWithTags = allNotes.filter((n) => n.tags && n.tags.length > 0);

    // Calculate tag statistics
    const tagStats = {
      // Basic counts
      totalTags: allTags.length,
      userTags: allTags.filter((t) => t.scope === "user").length,
      globalTags: allTags.filter((t) => t.scope === "global").length,

      // Embedding coverage
      tagsWithEmbeddings: allTags.filter(
        (t) => t.embedding && t.embedding.length > 0,
      ).length,
      embeddingCoverage:
        allTags.length > 0
          ? (
              (allTags.filter((t) => t.embedding && t.embedding.length > 0)
                .length /
                allTags.length) *
              100
            ).toFixed(1)
          : "0.0",

      // Usage distribution
      unusedTags: allTags.filter((t) => t.usageCount === 0).length,
      lowUsageTags: allTags.filter((t) => t.usageCount > 0 && t.usageCount < 5)
        .length,
      mediumUsageTags: allTags.filter(
        (t) => t.usageCount >= 5 && t.usageCount < 20,
      ).length,
      highUsageTags: allTags.filter((t) => t.usageCount >= 20).length,

      // Tag reuse (notes perspective)
      notesWithTags: notesWithTags.length,
      totalNotes: allNotes.length,
      avgTagsPerNote:
        notesWithTags.length > 0
          ? (
              notesWithTags.reduce((sum, n) => sum + (n.tags?.length || 0), 0) /
              notesWithTags.length
            ).toFixed(2)
          : "0.00",

      // Top tags
      topTags: allTags
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 20)
        .map((t) => ({
          displayName: t.displayName,
          usageCount: t.usageCount,
          hasEmbedding: !!(t.embedding && t.embedding.length > 0),
        })),
    };

    return tagStats;
  },
});

/**
 * Get detailed statistics for a specific user
 */
export const getUserTagMetrics = query({
  args: {
    userId: v.optional(v.id("users")), // If not provided, use current user
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      throw new Error("Not authenticated");
    }
    const targetUserId = args.userId || currentUser._id;

    // Admin can view any user, others only themselves
    if (!currentUser.isAdmin && targetUserId !== currentUser._id) {
      throw new Error("Access denied");
    }

    // Get user's tags
    const userTags = await ctx.db
      .query("tags")
      .withIndex("by_user_slug", (q) => q.eq("userId", targetUserId))
      .collect();

    // Get user's notes
    const userNotes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();

    const notesWithTags = userNotes.filter((n) => n.tags && n.tags.length > 0);

    // Calculate unique tags used
    const uniqueTagsUsed = new Set<string>();
    for (const note of notesWithTags) {
      if (note.tags) {
        for (const tag of note.tags) {
          uniqueTagsUsed.add(tag);
        }
      }
    }

    // Tag reuse rate calculation
    const totalTagApplications = notesWithTags.reduce(
      (sum, n) => sum + (n.tags?.length || 0),
      0,
    );
    const tagCreationRate =
      userTags.length > 0 && totalTagApplications > 0
        ? ((userTags.length / totalTagApplications) * 100).toFixed(1)
        : "0.0";
    const tagReuseRate = (100 - parseFloat(tagCreationRate)).toFixed(1);

    return {
      userId: targetUserId,

      // Tag inventory
      totalTags: userTags.length,
      tagsWithEmbeddings: userTags.filter(
        (t) => t.embedding && t.embedding.length > 0,
      ).length,
      unusedTags: userTags.filter((t) => t.usageCount === 0).length,

      // Note tagging
      totalNotes: userNotes.length,
      notesWithTags: notesWithTags.length,
      avgTagsPerNote:
        notesWithTags.length > 0
          ? (totalTagApplications / notesWithTags.length).toFixed(2)
          : "0.00",

      // Reuse metrics (target: >70%)
      uniqueTagsUsed: uniqueTagsUsed.size,
      totalTagApplications,
      tagReuseRate: `${tagReuseRate}%`, // Higher is better (existing tags reused)
      tagCreationRate: `${tagCreationRate}%`, // Lower is better (fewer new tags)

      // Top tags
      topTags: userTags
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10)
        .map((t) => ({
          displayName: t.displayName,
          usageCount: t.usageCount,
          hasEmbedding: !!(t.embedding && t.embedding.length > 0),
        })),
    };
  },
});

/**
 * Health check for auto-tagging system
 */
export const getSystemHealth = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.isAdmin) {
      throw new Error("Admin access required");
    }

    const allTags = await ctx.db.query("tags").collect();
    const embeddingCoverage =
      allTags.length > 0
        ? (allTags.filter((t) => t.embedding && t.embedding.length > 0).length /
            allTags.length) *
          100
        : 0;

    const allNotes = await ctx.db.query("notes").collect();
    const notesWithTags = allNotes.filter((n) => n.tags && n.tags.length > 0);
    const taggedNotesRate =
      allNotes.length > 0 ? (notesWithTags.length / allNotes.length) * 100 : 0;

    // Calculate overall tag reuse
    const totalTagApplications = notesWithTags.reduce(
      (sum, n) => sum + (n.tags?.length || 0),
      0,
    );
    const overallReuseRate =
      totalTagApplications > 0 && allTags.length > 0
        ? (1 - allTags.length / totalTagApplications) * 100
        : 0;

    // Health indicators
    const health = {
      status: "healthy" as "healthy" | "warning" | "critical",
      checks: {
        embeddingCoverage: {
          value: embeddingCoverage,
          target: 50, // At least 50% of tags should have embeddings
          status: embeddingCoverage >= 50 ? "pass" : "warn",
        },
        tagReuseRate: {
          value: overallReuseRate,
          target: 70, // Target: 70% tag reuse
          status:
            overallReuseRate >= 70
              ? "pass"
              : overallReuseRate >= 50
                ? "warn"
                : "fail",
        },
        taggedNotesRate: {
          value: taggedNotesRate,
          target: 80, // 80% of notes should have tags
          status:
            taggedNotesRate >= 80
              ? "pass"
              : taggedNotesRate >= 60
                ? "warn"
                : "fail",
        },
        avgTagsPerNote: {
          value:
            notesWithTags.length > 0
              ? totalTagApplications / notesWithTags.length
              : 0,
          target: 2.0, // Ideally 2-3 tags per note
          status:
            notesWithTags.length > 0
              ? totalTagApplications / notesWithTags.length >= 2.0
                ? "pass"
                : "warn"
              : "warn",
        },
      },
      summary: {
        totalTags: allTags.length,
        totalNotes: allNotes.length,
        notesWithTags: notesWithTags.length,
        embeddingCoveragePercent: embeddingCoverage.toFixed(1),
        tagReuseRatePercent: overallReuseRate.toFixed(1),
      },
    };

    // Determine overall status
    const failCount = Object.values(health.checks).filter(
      (c) => c.status === "fail",
    ).length;
    const warnCount = Object.values(health.checks).filter(
      (c) => c.status === "warn",
    ).length;

    if (failCount > 0) {
      health.status = "critical";
    } else if (warnCount > 1) {
      health.status = "warning";
    }

    return health;
  },
});
