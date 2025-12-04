import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getCurrentUserOrCreate, getCurrentUser } from "./lib/userSync";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      name: args.name,
      description: args.description,
      systemPrompt: args.systemPrompt,
      conversationIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== user._id) return null;

    return project;
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const project = await ctx.db.get(args.id);

    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.systemPrompt !== undefined) updates.systemPrompt = args.systemPrompt;

    await ctx.db.patch(args.id, updates);
  },
});

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const project = await ctx.db.get(args.id);

    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    // Remove project from all conversations
    for (const convId of project.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (conv && conv.projectId === args.id) {
        await ctx.db.patch(convId, {
          projectId: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.delete(args.id);
  },
});

export const addConversation = mutation({
  args: {
    projectId: v.id("projects"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const project = await ctx.db.get(args.projectId);
    const conversation = await ctx.db.get(args.conversationId);

    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    // Add to project
    if (!project.conversationIds.includes(args.conversationId)) {
      await ctx.db.patch(args.projectId, {
        conversationIds: [...project.conversationIds, args.conversationId],
        updatedAt: Date.now(),
      });
    }

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      projectId: args.projectId,
      updatedAt: Date.now(),
    });
  },
});

export const removeConversation = mutation({
  args: {
    projectId: v.id("projects"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const project = await ctx.db.get(args.projectId);

    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    // Remove from project
    await ctx.db.patch(args.projectId, {
      conversationIds: project.conversationIds.filter((id) => id !== args.conversationId),
      updatedAt: Date.now(),
    });

    // Remove from conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation && conversation.projectId === args.projectId) {
      await ctx.db.patch(args.conversationId, {
        projectId: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
