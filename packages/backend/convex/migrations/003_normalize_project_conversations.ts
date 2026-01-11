import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { logger } from "../lib/logger";

/**
 * Backfill junction table from existing project.conversationIds arrays
 * Idempotent - safe to re-run
 */
export const backfillBatch = internalMutation({
  args: {
    projects: v.array(
      v.object({
        _id: v.id("projects"),
        conversationIds: v.array(v.id("conversations")),
        userId: v.id("users"),
      }),
    ),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const project of args.projects) {
      for (const conversationId of project.conversationIds) {
        // Check if already exists (idempotent)
        const existing = await ctx.db
          .query("projectConversations")
          .withIndex("by_project_conversation", (q) =>
            q.eq("projectId", project._id).eq("conversationId", conversationId),
          )
          .first();

        if (existing) {
          skipped++;
          continue;
        }

        // Verify conversation exists and belongs to same user
        const conversation = await ctx.db.get(conversationId);
        if (!conversation || conversation.userId !== project.userId) {
          logger.warn("Skipping invalid conversation", {
            tag: "Migration",
            conversationId,
            projectId: project._id,
          });
          errors++;
          continue;
        }

        // Create junction row
        await ctx.db.insert("projectConversations", {
          projectId: project._id,
          conversationId,
          addedAt: Date.now(),
          addedBy: project.userId,
        });
        created++;
      }
    }

    return { created, skipped, errors };
  },
});

/**
 * Helper: fetch projects batch with pagination
 */
export const getProjectsBatch = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.number(),
  },
  handler: async (ctx, args) => {
    const query = ctx.db.query("projects");
    const page = await query.paginate({
      cursor: args.cursor ?? null,
      numItems: args.batchSize,
    });

    return {
      projects: page.page.map((p) => ({
        _id: p._id,
        // @ts-ignore - Historical migration: conversationIds removed in Deploy 3
        conversationIds: p.conversationIds ?? [],
        userId: p.userId,
      })),
      nextCursor: page.continueCursor,
    };
  },
});

/**
 * Verification: compare old array vs new junction table
 */
export const verifyMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    let matches = 0;
    let mismatches = 0;
    const errors: string[] = [];

    for (const project of projects) {
      // @ts-ignore - Historical migration: conversationIds removed in Deploy 3
      const arrayIds = new Set(project.conversationIds ?? []);

      const junctionDocs = await ctx.db
        .query("projectConversations")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      const junctionIds = new Set(junctionDocs.map((j) => j.conversationId));

      if (arrayIds.size !== junctionIds.size) {
        mismatches++;
        errors.push(
          `Project ${project._id}: array has ${arrayIds.size}, junction has ${junctionIds.size}`,
        );
        continue;
      }

      for (const id of arrayIds) {
        // @ts-ignore - Type inference issue after migration field removal
        if (!junctionIds.has(id)) {
          mismatches++;
          errors.push(
            `Project ${project._id}: array has ${id} but junction doesn't`,
          );
          break;
        }
      }

      matches++;
    }

    return {
      summary: {
        totalProjects: projects.length,
        matches,
        mismatches,
        matchPercentage:
          projects.length > 0
            ? ((matches / projects.length) * 100).toFixed(1)
            : "0",
      },
      errors: errors.slice(0, 10), // Only show first 10 errors
      recommendation:
        mismatches === 0
          ? "Migration verified - ready for Deploy 2"
          : `Found ${mismatches} mismatches - investigate before proceeding`,
    };
  },
});
