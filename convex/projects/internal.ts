import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

// ===== Internal Queries =====

export const getInternal = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getConversationCount = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const junctions = await ctx.db
      .query("projectConversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return junctions.length;
  },
});
