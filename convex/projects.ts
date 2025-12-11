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

    // Remove project from all conversations via junction table
    const junctions = await ctx.db
      .query("projectConversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const junction of junctions) {
      // Delete junction row
      await ctx.db.delete(junction._id);

      // Unlink conversation
      const conv = await ctx.db.get(junction.conversationId);
      if (conv && conv.projectId === args.id) {
        await ctx.db.patch(junction.conversationId, {
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

    // 1. Check if junction exists (Phase 3 migration)
    const existing = await ctx.db
      .query("projectConversations")
      .withIndex("by_project_conversation", (q) =>
        q.eq("projectId", args.projectId).eq("conversationId", args.conversationId),
      )
      .first();

    // 2. Insert junction row if not exists
    if (!existing) {
      await ctx.db.insert("projectConversations", {
        projectId: args.projectId,
        conversationId: args.conversationId,
        addedAt: Date.now(),
        addedBy: user._id,
      });
    }

    // 3. Update conversation.projectId
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

    // 1. Delete junction row (Phase 3 migration)
    const junction = await ctx.db
      .query("projectConversations")
      .withIndex("by_project_conversation", (q) =>
        q.eq("projectId", args.projectId).eq("conversationId", args.conversationId),
      )
      .first();
    if (junction) {
      await ctx.db.delete(junction._id);
    }

    // 2. Clear conversation.projectId
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

    // 1. Update each conversation's projectId (source of truth)
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

    // 2. Sync junction table (Phase 3 migration)
    if (args.projectId) {
      const projectId = args.projectId;

      // 2a. Remove all existing junctions for project
      const existingJunctions = await ctx.db
        .query("projectConversations")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .collect();
      for (const junction of existingJunctions) {
        await ctx.db.delete(junction._id);
      }

      // 2b. Create new junctions
      for (const convId of args.conversationIds) {
        await ctx.db.insert("projectConversations", {
          projectId,
          conversationId: convId,
          addedAt: Date.now(),
          addedBy: user._id,
        });
      }

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

    // Query junction table (Phase 3 migration - Deploy 2)
    const junctions = await ctx.db
      .query("projectConversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Fetch conversations
    const conversations = await Promise.all(
      junctions.map((j) => ctx.db.get(j.conversationId)),
    );
    const validConversations = conversations.filter((c) => c !== null);

    // Calculate stats
    const conversationCount = validConversations.length;
    const lastActivity =
      validConversations.length > 0
        ? Math.max(...validConversations.map((c) => c.lastMessageAt))
        : 0;

    return {
      conversationCount,
      lastActivity,
    };
  },
});

export const getProjectConversationIds = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Query junction table (Phase 3 migration - Deploy 2)
    const junctions = await ctx.db
      .query("projectConversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return junctions.map((j) => j.conversationId);
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
      isTemplate: false,
      createdFrom: args.templateId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

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
