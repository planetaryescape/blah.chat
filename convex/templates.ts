import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

export const create = mutation({
  args: {
    name: v.string(),
    prompt: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const templateId = await ctx.db.insert("templates", {
      userId: user._id,
      name: args.name,
      prompt: args.prompt,
      description: args.description,
      category: args.category,
      isBuiltIn: false,
      isPublic: args.isPublic || false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return templateId;
  },
});

export const list = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let templates = await ctx.db
      .query("templates")
      .filter((q) =>
        q.or(
          q.eq(q.field("isBuiltIn"), true),
          q.eq(q.field("userId"), user._id),
        ),
      )
      .collect();

    if (args.category) {
      templates = templates.filter((t) => t.category === args.category);
    }

    return templates.sort((a, b) => {
      // Sort: built-in first, then by usage count, then by name
      if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
      if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
      return a.name.localeCompare(b.name);
    });
  },
});

export const get = query({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) return null;

    // Built-in templates are visible to everyone
    if (template.isBuiltIn) return template;

    // User templates require auth
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    if (template.userId !== user._id) return null;

    return template;
  },
});

export const update = mutation({
  args: {
    id: v.id("templates"),
    name: v.optional(v.string()),
    prompt: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const template = await ctx.db.get(args.id);

    if (!template || template.userId !== user._id || template.isBuiltIn) {
      throw new Error("Template not found or cannot be modified");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.prompt !== undefined) updates.prompt = args.prompt;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;

    await ctx.db.patch(args.id, updates);
  },
});

export const deleteTemplate = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const template = await ctx.db.get(args.id);

    if (!template || template.userId !== user._id || template.isBuiltIn) {
      throw new Error("Template not found or cannot be deleted");
    }

    await ctx.db.delete(args.id);
  },
});

export const incrementUsage = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) return;

    await ctx.db.patch(args.id, {
      usageCount: template.usageCount + 1,
      updatedAt: Date.now(),
    });
  },
});
