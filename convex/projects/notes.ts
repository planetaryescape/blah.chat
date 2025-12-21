import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUserOrCreate } from "../lib/userSync";

// ===== Note Junction Operations =====

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
