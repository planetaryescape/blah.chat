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
        q
          .eq("projectId", args.projectId)
          .eq("conversationId", args.conversationId),
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
        q
          .eq("projectId", args.projectId)
          .eq("conversationId", args.conversationId),
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

// Smart Manager Phase 3: Note Junction Operations

export const addNoteToProject = mutation({
  args: {
    projectId: v.id("projects"),
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Dual ownership check
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found");
    }

    // Duplicate prevention
    const existing = await ctx.db
      .query("projectNotes")
      .withIndex("by_project_note", (q) =>
        q.eq("projectId", args.projectId).eq("noteId", args.noteId),
      )
      .first();
    if (existing) return existing._id;

    // Insert junction
    const junctionId = await ctx.db.insert("projectNotes", {
      projectId: args.projectId,
      noteId: args.noteId,
      userId: user._id,
      addedAt: Date.now(),
    });

    // Activity event
    await ctx.db.insert("activityEvents", {
      userId: user._id,
      projectId: args.projectId,
      eventType: "note_linked",
      resourceType: "note",
      resourceId: args.noteId,
      metadata: { title: note.title },
      createdAt: Date.now(),
    });

    return junctionId;
  },
});

export const removeNoteFromProject = mutation({
  args: {
    projectId: v.id("projects"),
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const project = await ctx.db.get(args.projectId);

    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    // Delete junction row
    const junction = await ctx.db
      .query("projectNotes")
      .withIndex("by_project_note", (q) =>
        q.eq("projectId", args.projectId).eq("noteId", args.noteId),
      )
      .first();
    if (junction) {
      await ctx.db.delete(junction._id);

      // Activity event
      const note = await ctx.db.get(args.noteId);
      if (note) {
        await ctx.db.insert("activityEvents", {
          userId: user._id,
          projectId: args.projectId,
          eventType: "note_removed",
          resourceType: "note",
          resourceId: args.noteId,
          metadata: { title: note.title },
          createdAt: Date.now(),
        });
      }
    }
  },
});

// Smart Manager Phase 3: File Junction Operations

export const addFileToProject = mutation({
  args: {
    projectId: v.id("projects"),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Dual ownership check
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== user._id) {
      throw new Error("File not found");
    }

    // Duplicate prevention
    const existing = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_file", (q) =>
        q.eq("projectId", args.projectId).eq("fileId", args.fileId),
      )
      .first();
    if (existing) return existing._id;

    // Insert junction
    const junctionId = await ctx.db.insert("projectFiles", {
      projectId: args.projectId,
      fileId: args.fileId,
      userId: user._id,
      addedAt: Date.now(),
    });

    // Activity event
    await ctx.db.insert("activityEvents", {
      userId: user._id,
      projectId: args.projectId,
      eventType: "file_linked",
      resourceType: "file",
      resourceId: args.fileId,
      metadata: { filename: file.name },
      createdAt: Date.now(),
    });

    return junctionId;
  },
});

export const removeFileFromProject = mutation({
  args: {
    projectId: v.id("projects"),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const project = await ctx.db.get(args.projectId);

    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    // Delete junction row
    const junction = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_file", (q) =>
        q.eq("projectId", args.projectId).eq("fileId", args.fileId),
      )
      .first();
    if (junction) {
      await ctx.db.delete(junction._id);

      // Activity event
      const file = await ctx.db.get(args.fileId);
      if (file) {
        await ctx.db.insert("activityEvents", {
          userId: user._id,
          projectId: args.projectId,
          eventType: "file_removed",
          resourceType: "file",
          resourceId: args.fileId,
          metadata: { filename: file.name },
          createdAt: Date.now(),
        });
      }
    }
  },
});

// Smart Manager Phase 3: Bulk Operations

export const bulkAddNotesToProject = mutation({
  args: {
    projectId: v.id("projects"),
    noteIds: v.array(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    const results = {
      added: [] as any[],
      skipped: [] as any[],
      errors: [] as any[],
    };

    for (const noteId of args.noteIds) {
      try {
        // Reuse single-add mutation logic
        const note = await ctx.db.get(noteId);
        if (!note || note.userId !== user._id) {
          results.errors.push({ noteId, error: "Note not found" });
          continue;
        }

        const existing = await ctx.db
          .query("projectNotes")
          .withIndex("by_project_note", (q) =>
            q.eq("projectId", args.projectId).eq("noteId", noteId),
          )
          .first();

        if (existing) {
          results.skipped.push(noteId);
          continue;
        }

        const junctionId = await ctx.db.insert("projectNotes", {
          projectId: args.projectId,
          noteId,
          userId: user._id,
          addedAt: Date.now(),
        });

        await ctx.db.insert("activityEvents", {
          userId: user._id,
          projectId: args.projectId,
          eventType: "note_linked",
          resourceType: "note",
          resourceId: noteId,
          metadata: { title: note.title },
          createdAt: Date.now(),
        });

        results.added.push(junctionId);
      } catch (error: any) {
        results.errors.push({ noteId, error: error.message });
      }
    }

    return results;
  },
});

export const bulkAddFilesToProject = mutation({
  args: {
    projectId: v.id("projects"),
    fileIds: v.array(v.id("files")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    const results = {
      added: [] as any[],
      skipped: [] as any[],
      errors: [] as any[],
    };

    for (const fileId of args.fileIds) {
      try {
        // Reuse single-add mutation logic
        const file = await ctx.db.get(fileId);
        if (!file || file.userId !== user._id) {
          results.errors.push({ fileId, error: "File not found" });
          continue;
        }

        const existing = await ctx.db
          .query("projectFiles")
          .withIndex("by_project_file", (q) =>
            q.eq("projectId", args.projectId).eq("fileId", fileId),
          )
          .first();

        if (existing) {
          results.skipped.push(fileId);
          continue;
        }

        const junctionId = await ctx.db.insert("projectFiles", {
          projectId: args.projectId,
          fileId,
          userId: user._id,
          addedAt: Date.now(),
        });

        await ctx.db.insert("activityEvents", {
          userId: user._id,
          projectId: args.projectId,
          eventType: "file_linked",
          resourceType: "file",
          resourceId: fileId,
          metadata: { filename: file.name },
          createdAt: Date.now(),
        });

        results.added.push(junctionId);
      } catch (error: any) {
        results.errors.push({ fileId, error: error.message });
      }
    }

    return results;
  },
});

// Smart Manager Phase 3: Unified Resource Queries

export const getProjectResources = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) return null;

    // Fetch all junctions in parallel
    const [conversationJunctions, noteJunctions, fileJunctions, tasks] =
      await Promise.all([
        ctx.db
          .query("projectConversations")
          .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
          .collect(),
        ctx.db
          .query("projectNotes")
          .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
          .collect(),
        ctx.db
          .query("projectFiles")
          .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
          .collect(),
        ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
          .collect(),
      ]);

    // Batch hydrate (N+1 prevention)
    const [conversations, notes, files] = await Promise.all([
      Promise.all(
        conversationJunctions.map((j) => ctx.db.get(j.conversationId)),
      ),
      Promise.all(noteJunctions.map((j) => ctx.db.get(j.noteId))),
      Promise.all(fileJunctions.map((j) => ctx.db.get(j.fileId))),
    ]);

    // Filter deleted resources
    return {
      project,
      conversations: conversations.filter(
        (c): c is NonNullable<typeof c> => c !== null,
      ),
      notes: notes.filter((n): n is NonNullable<typeof n> => n !== null),
      files: files.filter((f): f is NonNullable<typeof f> => f !== null),
      tasks,
    };
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

    // Fetch all resource counts and activity in parallel
    const [
      conversationJunctions,
      noteJunctions,
      fileJunctions,
      allTasks,
      lastActivity,
    ] = await Promise.all([
      ctx.db
        .query("projectConversations")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("projectNotes")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("projectFiles")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("activityEvents")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .first(),
    ]);

    // Task breakdown
    const taskStats = {
      total: allTasks.length,
      active: allTasks.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled",
      ).length,
      completed: allTasks.filter((t) => t.status === "completed").length,
    };

    return {
      conversationCount: conversationJunctions.length,
      noteCount: noteJunctions.length,
      fileCount: fileJunctions.length,
      taskStats,
      lastActivityAt:
        lastActivity?.createdAt || project._creationTime || Date.now(),
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

// Smart Manager Phase 3: Activity Feed Queries

export const getProjectActivity = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) return null;

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // Fetch events (ordered newest first)
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    const paginatedEvents = events.slice(offset, offset + limit);

    // N+1 PREVENTION: Deduplicate resource IDs by type
    const resourceIdsByType: Record<string, Set<any>> = {
      task: new Set(),
      note: new Set(),
      file: new Set(),
      conversation: new Set(),
    };

    for (const event of paginatedEvents) {
      if (event.resourceType && event.resourceId) {
        resourceIdsByType[event.resourceType]?.add(event.resourceId);
      }
    }

    // Batch fetch all resources in parallel
    const [tasks, notes, files, conversations] = await Promise.all([
      Promise.all([...resourceIdsByType.task].map((id) => ctx.db.get(id))),
      Promise.all([...resourceIdsByType.note].map((id) => ctx.db.get(id))),
      Promise.all([...resourceIdsByType.file].map((id) => ctx.db.get(id))),
      Promise.all(
        [...resourceIdsByType.conversation].map((id) => ctx.db.get(id)),
      ),
    ]);

    // Create lookup maps (filter nulls)
    const resourceMaps: Record<string, Map<any, any>> = {
      task: new Map(
        tasks
          .filter((t): t is NonNullable<typeof t> => t !== null)
          .map((t) => [t._id, t]),
      ),
      note: new Map(
        notes
          .filter((n): n is NonNullable<typeof n> => n !== null)
          .map((n) => [n._id, n]),
      ),
      file: new Map(
        files
          .filter((f): f is NonNullable<typeof f> => f !== null)
          .map((f) => [f._id, f]),
      ),
      conversation: new Map(
        conversations
          .filter((c): c is NonNullable<typeof c> => c !== null)
          .map((c) => [c._id, c]),
      ),
    };

    // Hydrate events with resources
    const hydratedEvents = paginatedEvents.map((event) => ({
      ...event,
      resource: event.resourceType
        ? resourceMaps[event.resourceType]?.get(event.resourceId) || null
        : null,
    }));

    return {
      events: hydratedEvents,
      total: events.length,
      hasMore: offset + limit < events.length,
    };
  },
});

export const getUserActivity = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // Fetch events (ordered newest first)
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const paginatedEvents = events.slice(offset, offset + limit);

    // N+1 PREVENTION: Deduplicate resource and project IDs
    const resourceIdsByType: Record<string, Set<any>> = {
      task: new Set(),
      note: new Set(),
      file: new Set(),
      conversation: new Set(),
    };
    const projectIds = new Set<any>();

    for (const event of paginatedEvents) {
      if (event.resourceType && event.resourceId) {
        resourceIdsByType[event.resourceType]?.add(event.resourceId);
      }
      if (event.projectId) {
        projectIds.add(event.projectId);
      }
    }

    // Batch fetch all resources and projects in parallel
    const [tasks, notes, files, conversations, projects] = await Promise.all([
      Promise.all([...resourceIdsByType.task].map((id) => ctx.db.get(id))),
      Promise.all([...resourceIdsByType.note].map((id) => ctx.db.get(id))),
      Promise.all([...resourceIdsByType.file].map((id) => ctx.db.get(id))),
      Promise.all(
        [...resourceIdsByType.conversation].map((id) => ctx.db.get(id)),
      ),
      Promise.all([...projectIds].map((id) => ctx.db.get(id))),
    ]);

    // Create lookup maps (filter nulls)
    const resourceMaps: Record<string, Map<any, any>> = {
      task: new Map(
        tasks
          .filter((t): t is NonNullable<typeof t> => t !== null)
          .map((t) => [t._id, t]),
      ),
      note: new Map(
        notes
          .filter((n): n is NonNullable<typeof n> => n !== null)
          .map((n) => [n._id, n]),
      ),
      file: new Map(
        files
          .filter((f): f is NonNullable<typeof f> => f !== null)
          .map((f) => [f._id, f]),
      ),
      conversation: new Map(
        conversations
          .filter((c): c is NonNullable<typeof c> => c !== null)
          .map((c) => [c._id, c]),
      ),
    };

    const projectMap = new Map(
      projects
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => [p._id, p]),
    );

    // Hydrate events with resources and projects
    const hydratedEvents = paginatedEvents.map((event) => ({
      ...event,
      resource: event.resourceType
        ? resourceMaps[event.resourceType]?.get(event.resourceId) || null
        : null,
      project: event.projectId ? projectMap.get(event.projectId) || null : null,
    }));

    return {
      events: hydratedEvents,
      total: events.length,
      hasMore: offset + limit < events.length,
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
