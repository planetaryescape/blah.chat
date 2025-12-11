import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Phase 3 Deploy 3: Remove conversationIds field from existing projects
 * Run before schema change to ensure validation passes
 */
export const removeConversationIdsFromProjects = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    let updated = 0;

    const projects = await ctx.db
      .query("projects")
      .collect();

    for (const project of projects) {
      // @ts-ignore - Removing deprecated field
      if (project.conversationIds !== undefined) {
        // Remove the field by patching without it
        await ctx.db.patch(project._id, {
          // @ts-ignore - Removing deprecated field
          conversationIds: undefined,
        });
        updated++;

        if (updated >= batchSize) break;
      }
    }

    return { updated, remaining: projects.length - updated };
  },
});

export const countProjectsWithConversationIds = internalQuery({
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    // @ts-ignore - Checking for deprecated field
    const withField = projects.filter(p => p.conversationIds !== undefined);
    return {
      total: projects.length,
      withField: withField.length,
      percentage: projects.length > 0
        ? ((withField.length / projects.length) * 100).toFixed(1)
        : "0",
    };
  },
});
