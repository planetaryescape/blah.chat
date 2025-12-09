import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      name: args.name,
      description: args.description,
      systemPrompt: args.systemPrompt,
      conversationIds: [],
      isTemplate: args.isTemplate,
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
    if (args.systemPrompt !== undefined)
      updates.systemPrompt = args.systemPrompt;

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
      conversationIds: project.conversationIds.filter(
        (id) => id !== args.conversationId,
      ),
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

export const assignConversations = mutation({
  args: {
    projectId: v.union(v.id("projects"), v.null()),
    conversationIds: v.array(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Verify project ownership if assigning to project
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== user._id) {
        throw new Error("Project not found");
      }
    }

    // Update each conversation's projectId
    for (const convId of args.conversationIds) {
      const conversation = await ctx.db.get(convId);
      if (!conversation || conversation.userId !== user._id) {
        continue; // Skip conversations user doesn't own
      }

      await ctx.db.patch(convId, {
        projectId: args.projectId || undefined,
        updatedAt: Date.now(),
      });
    }

    // Rebuild conversationIds array from source of truth (conversations table)
    if (args.projectId) {
      const projectId = args.projectId;
      const allProjectConvos = await ctx.db
        .query("conversations")
        .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
        .collect();

      await ctx.db.patch(projectId, {
        conversationIds: allProjectConvos.map((c) => c._id),
        updatedAt: Date.now(),
      });
    }
  },
});

export const getProjectStats = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      return null;
    }

    // Query conversations using index
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Calculate stats
    const conversationCount = conversations.length;
    const lastActivity =
      conversations.length > 0
        ? Math.max(...conversations.map((c) => c.lastMessageAt))
        : 0;

    return {
      conversationCount,
      lastActivity,
    };
  },
});

export const listTemplates = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const templates = await ctx.db
      .query("projects")
      .withIndex("by_userId_isTemplate", (q) =>
        q.eq("userId", user._id).eq("isTemplate", true),
      )
      .collect();

    return templates.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const createFromTemplate = mutation({
  args: { templateId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const template = await ctx.db.get(args.templateId);

    if (!template || template.userId !== user._id) {
      throw new Error("Template not found");
    }

    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      name: `${template.name} (Copy)`,
      description: template.description,
      systemPrompt: template.systemPrompt,
      conversationIds: [],
      isTemplate: false,
      createdFrom: args.templateId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

export const rebuildConversationIds = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const project = await ctx.db.get(args.projectId);

    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    // Rebuild from source of truth
    const allProjectConvos = await ctx.db
      .query("conversations")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    await ctx.db.patch(args.projectId, {
      conversationIds: allProjectConvos.map((c) => c._id),
      updatedAt: Date.now(),
    });

    return { count: allProjectConvos.length };
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
