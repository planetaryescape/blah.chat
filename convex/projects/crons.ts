import { internalMutation } from "../_generated/server";

export const rebuildAllProjects = internalMutation({
  handler: async (ctx) => {
    // Get all projects
    const projects = await ctx.db.query("projects").collect();

    let rebuiltCount = 0;

    // Rebuild each project's conversationIds array
    for (const project of projects) {
      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
        .collect();

      await ctx.db.patch(project._id, {
        conversationIds: conversations.map((c) => c._id),
        updatedAt: Date.now(),
      });

      rebuiltCount++;
    }

    console.log(`Rebuilt ${rebuiltCount} project conversation arrays`);
    return { rebuiltCount };
  },
});
