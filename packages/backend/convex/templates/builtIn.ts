import { mutation } from "../_generated/server";
import { BUILT_IN_TEMPLATES } from "../lib/prompts/templates/builtIn";

// Re-export for backward compatibility
export { BUILT_IN_TEMPLATES } from "../lib/prompts/templates/builtIn";

export const seedBuiltInTemplates = mutation({
  handler: async (ctx) => {
    // Check if built-in templates already exist
    const existing = await ctx.db
      .query("templates")
      .filter((q) => q.eq(q.field("isBuiltIn"), true))
      .collect();

    if (existing.length > 0) {
      return {
        message: "Built-in templates already exist",
        count: existing.length,
      };
    }

    // Insert all built-in templates
    for (const template of BUILT_IN_TEMPLATES) {
      await ctx.db.insert("templates", {
        userId: undefined,
        name: template.name,
        prompt: template.prompt,
        description: template.description,
        category: template.category,
        isBuiltIn: true,
        isPublic: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return {
      message: "Built-in templates seeded",
      count: BUILT_IN_TEMPLATES.length,
    };
  },
});
