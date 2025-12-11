# Phase 3: Project Expansion Backend - Junctions, Resources & Activity

## Overview

Extend the projects system to support linking notes, files, and tasks. Build unified resource queries and activity feed tracking.

**Duration**: 1-2 days
**Dependencies**: Phase 1 (Schema), Phase 2 (Tasks)
**Output**: Projects can link to all resource types, activity feed working

## Context: What We're Building

**Expanded Projects** transforms projects from simple conversation containers into full workspace hubs. This phase builds the backend infrastructure:

1. **Junction Operations**: Add/remove notes and files to projects
2. **Unified Resource Queries**: Single query to get all project resources
3. **Activity Feed**: Track all project events in real-time
4. **Memory Integration**: Link memories to projects via transcripts

## Existing Patterns to Follow

### 1. Project Conversations Junction (`convex/projects.ts` lines 115-192)

**Pattern**: Phase 3 migration complete - dual-write to junction + projectId field

```typescript
// Add conversation to project
export const addConversation = mutation({
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const project = await ctx.db.get(args.projectId);
    const conversation = await ctx.db.get(args.conversationId);

    // Ownership checks
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    // Check if already linked (prevent duplicates)
    const existing = await ctx.db
      .query("projectConversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
      .first();

    if (existing) return existing._id;

    // Insert junction
    const junctionId = await ctx.db.insert("projectConversations", {
      projectId: args.projectId,
      conversationId: args.conversationId,
      userId: user._id,
      addedBy: user._id,
      addedAt: Date.now(),
    });

    // Dual-write: Update conversation.projectId field
    await ctx.db.patch(args.conversationId, {
      projectId: args.projectId,
    });

    return junctionId;
  },
});
```

### 2. Activity Events Pattern (from Phase 1 schema)

```typescript
await ctx.db.insert("activityEvents", {
  userId: user._id,
  projectId: args.projectId,
  eventType: "conversation_linked",
  resourceType: "conversation",
  resourceId: args.conversationId,
  createdAt: Date.now(),
});
```

### 3. Resource Hydration Pattern

```typescript
// Get junction records
const noteLinks = await ctx.db
  .query("projectNotes")
  .withIndex("by_project", (q) => q.eq("projectId", projectId))
  .collect();

// Hydrate with actual resources
const notes = await Promise.all(
  noteLinks.map((link) => ctx.db.get(link.noteId))
);

// Filter out deleted resources
return notes.filter(Boolean);
```

## Implementation Part 1: Junction Mutations

### File: `convex/projects.ts` (EXTEND)

Add these mutations after the existing conversation junction code:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

// ============================================================
// NOTE JUNCTION MUTATIONS
// ============================================================

/**
 * Link note to project
 */
export const addNoteToProject = mutation({
  args: {
    projectId: v.id("projects"),
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Ownership checks
    const project = await ctx.db.get(args.projectId);
    const note = await ctx.db.get(args.noteId);

    if (!project || project.userId !== user._id) {
      throw new Error("Project not found or access denied");
    }
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found or access denied");
    }

    // Check if already linked
    const existing = await ctx.db
      .query("projectNotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("noteId"), args.noteId))
      .first();

    if (existing) {
      return existing._id; // Already linked
    }

    // Insert junction
    const linkId = await ctx.db.insert("projectNotes", {
      projectId: args.projectId,
      noteId: args.noteId,
      userId: user._id,
      addedAt: Date.now(),
    });

    // Create activity event
    await ctx.db.insert("activityEvents", {
      userId: user._id,
      projectId: args.projectId,
      eventType: "note_linked",
      resourceType: "note",
      resourceId: args.noteId,
      metadata: {
        noteTitle: note.title,
      },
      createdAt: Date.now(),
    });

    return linkId;
  },
});

/**
 * Remove note from project
 */
export const removeNoteFromProject = mutation({
  args: {
    projectId: v.id("projects"),
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Find junction record
    const link = await ctx.db
      .query("projectNotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("noteId"), args.noteId))
      .first();

    if (!link || link.userId !== user._id) {
      throw new Error("Link not found or access denied");
    }

    // Delete junction
    await ctx.db.delete(link._id);
  },
});

// ============================================================
// FILE JUNCTION MUTATIONS
// ============================================================

/**
 * Link file to project
 */
export const addFileToProject = mutation({
  args: {
    projectId: v.id("projects"),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Ownership checks
    const project = await ctx.db.get(args.projectId);
    const file = await ctx.db.get(args.fileId);

    if (!project || project.userId !== user._id) {
      throw new Error("Project not found or access denied");
    }
    if (!file || file.userId !== user._id) {
      throw new Error("File not found or access denied");
    }

    // Check if already linked
    const existing = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("fileId"), args.fileId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Insert junction
    const linkId = await ctx.db.insert("projectFiles", {
      projectId: args.projectId,
      fileId: args.fileId,
      userId: user._id,
      addedAt: Date.now(),
    });

    // Create activity event
    await ctx.db.insert("activityEvents", {
      userId: user._id,
      projectId: args.projectId,
      eventType: "file_uploaded",
      resourceType: "file",
      resourceId: args.fileId,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
      },
      createdAt: Date.now(),
    });

    return linkId;
  },
});

/**
 * Remove file from project
 */
export const removeFileFromProject = mutation({
  args: {
    projectId: v.id("projects"),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Find junction record
    const link = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("fileId"), args.fileId))
      .first();

    if (!link || link.userId !== user._id) {
      throw new Error("Link not found or access denied");
    }

    // Delete junction
    await ctx.db.delete(link._id);
  },
});
```

## Implementation Part 2: Unified Resource Queries

### File: `convex/projects.ts` (EXTEND)

Add these queries:

```typescript
/**
 * Get all resources linked to a project
 * Returns: { conversations, notes, files, tasks }
 */
export const getProjectResources = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      return null;
    }

    // Get conversation links
    const conversationLinks = await ctx.db
      .query("projectConversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const conversations = (
      await Promise.all(
        conversationLinks.map((link) => ctx.db.get(link.conversationId))
      )
    ).filter(Boolean);

    // Get note links
    const noteLinks = await ctx.db
      .query("projectNotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const notes = (
      await Promise.all(noteLinks.map((link) => ctx.db.get(link.noteId)))
    ).filter(Boolean);

    // Get file links
    const fileLinks = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const files = (
      await Promise.all(fileLinks.map((link) => ctx.db.get(link.fileId)))
    ).filter(Boolean);

    // Get tasks (direct link via projectId field)
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return {
      project,
      conversations,
      notes,
      files,
      tasks,
    };
  },
});

/**
 * Get project statistics
 */
export const getProjectStats = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      return null;
    }

    // Count resources
    const conversationCount = await ctx.db
      .query("projectConversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect()
      .then((links) => links.length);

    const noteCount = await ctx.db
      .query("projectNotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect()
      .then((links) => links.length);

    const fileCount = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect()
      .then((links) => links.length);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const activeTaskCount = tasks.filter(
      (t) => t.status === "confirmed" || t.status === "in_progress"
    ).length;

    const completedTaskCount = tasks.filter(
      (t) => t.status === "completed"
    ).length;

    return {
      conversationCount,
      noteCount,
      fileCount,
      taskCount: tasks.length,
      activeTaskCount,
      completedTaskCount,
    };
  },
});
```

## Implementation Part 3: Activity Feed

### File: `convex/projects.ts` (EXTEND)

```typescript
/**
 * Get project activity feed
 */
export const getProjectActivity = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      return [];
    }

    // Get activity events
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(args.limit || 50);

    // Hydrate with resource details
    const hydratedEvents = await Promise.all(
      events.map(async (event) => {
        let resource = null;

        // Fetch resource based on type
        if (event.resourceType === "task") {
          resource = await ctx.db.get(event.resourceId as any);
        } else if (event.resourceType === "note") {
          resource = await ctx.db.get(event.resourceId as any);
        } else if (event.resourceType === "file") {
          resource = await ctx.db.get(event.resourceId as any);
        } else if (event.resourceType === "conversation") {
          resource = await ctx.db.get(event.resourceId as any);
        }

        return {
          ...event,
          resource, // May be null if resource was deleted
        };
      })
    );

    return hydratedEvents;
  },
});

/**
 * Get user's global activity feed (all projects)
 */
export const getUserActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 50);

    // Hydrate with project + resource
    const hydratedEvents = await Promise.all(
      events.map(async (event) => {
        const project = event.projectId
          ? await ctx.db.get(event.projectId)
          : null;

        let resource = null;
        if (event.resourceType === "task") {
          resource = await ctx.db.get(event.resourceId as any);
        } else if (event.resourceType === "note") {
          resource = await ctx.db.get(event.resourceId as any);
        }

        return {
          ...event,
          project,
          resource,
        };
      })
    );

    return hydratedEvents;
  },
});
```

## Implementation Part 4: Memory Integration

### File: `convex/memories.ts` (EXTEND SCHEMA)

Update schema to add project tracking (already in Phase 1 schema):

```typescript
// In defineTable for memories:
memories: defineTable({
  // ... existing fields ...

  // NEW: Source tracking
  sourceType: v.optional(v.union(
    v.literal("conversation"),
    v.literal("transcript"),
    v.literal("manual")
  )),
  sourceId: v.optional(v.string()),

  // NEW: Project link
  projectId: v.optional(v.id("projects")),
})
```

### File: `convex/ai/memoryExtraction.ts` (EXTEND)

```typescript
"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Extract memories from transcript and link to project
 */
export const extractMemoriesFromTranscript = action({
  args: {
    transcript: v.string(),
    sourceId: v.string(),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = ((await (ctx.runQuery as any)(
      // @ts-ignore
      internal.lib.helpers.getCurrentUser
    )) as any);

    if (!user) throw new Error("Not authenticated");

    // Reuse existing extraction logic
    // This is a simplified version - actual implementation should
    // call the existing memory extraction action and extend it

    const memories = ((await (ctx.runAction as any)(
      // @ts-ignore
      internal.memories.extract.extractFromContent,
      {
        content: args.transcript,
        userId: user._id,
      }
    )) as any[]);

    // Store memories with source and project tracking
    for (const memory of memories) {
      await ((ctx.runMutation as any)(
        // @ts-ignore
        internal.memories.create,
        {
          ...memory,
          sourceType: "transcript",
          sourceId: args.sourceId,
          projectId: args.projectId,
        }
      ));

      // Create activity event if project linked
      if (args.projectId) {
        await ((ctx.runMutation as any)(
          // @ts-ignore
          internal.activityEvents.create,
          {
            userId: user._id,
            projectId: args.projectId,
            eventType: "memory_extracted",
            resourceType: "memory",
            resourceId: memory.id,
            metadata: {
              category: memory.category,
              importance: memory.importance,
            },
            createdAt: Date.now(),
          }
        ));
      }
    }

    return memories.length;
  },
});
```

## Implementation Part 5: Bulk Operations

### File: `convex/projects.ts` (EXTEND)

```typescript
/**
 * Bulk link notes to project
 */
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

    const results = [];

    for (const noteId of args.noteIds) {
      try {
        const linkId = await ctx.runMutation(api.projects.addNoteToProject, {
          projectId: args.projectId,
          noteId,
        });
        results.push({ noteId, success: true, linkId });
      } catch (error: any) {
        results.push({ noteId, success: false, error: error.message });
      }
    }

    return results;
  },
});

/**
 * Bulk link files to project
 */
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

    const results = [];

    for (const fileId of args.fileIds) {
      try {
        const linkId = await ctx.runMutation(api.projects.addFileToProject, {
          projectId: args.projectId,
          fileId,
        });
        results.push({ fileId, success: true, linkId });
      } catch (error: any) {
        results.push({ fileId, success: false, error: error.message });
      }
    }

    return results;
  },
});
```

## Testing

### 1. Test Junction Operations

```typescript
// In Convex dashboard Functions tab

// Create test data
const projectId = await ctx.runMutation(api.projects.create, {
  name: "Test Project",
  description: "Testing junctions",
});

const noteId = await ctx.runMutation(api.notes.createNote, {
  title: "Test Note",
  content: "This is a test note",
});

// Link note to project
await ctx.runMutation(api.projects.addNoteToProject, {
  projectId,
  noteId,
});

// Verify junction created
const noteLinks = await ctx.db
  .query("projectNotes")
  .withIndex("by_project", (q) => q.eq("projectId", projectId))
  .collect();

console.log(noteLinks); // Should have 1 link
```

### 2. Test Resource Queries

```typescript
// Get all project resources
const resources = await ctx.runQuery(api.projects.getProjectResources, {
  projectId: "<project-id>",
});

console.log(resources);
// Should return:
// {
//   project: {...},
//   conversations: [...],
//   notes: [...],
//   files: [...],
//   tasks: [...]
// }
```

### 3. Test Activity Feed

```typescript
// Get project activity
const activity = await ctx.runQuery(api.projects.getProjectActivity, {
  projectId: "<project-id>",
  limit: 10,
});

console.log(activity);
// Should show recent events with hydrated resources
```

### 4. Test Duplicate Prevention

```typescript
// Try to link same note twice
const linkId1 = await ctx.runMutation(api.projects.addNoteToProject, {
  projectId,
  noteId,
});

const linkId2 = await ctx.runMutation(api.projects.addNoteToProject, {
  projectId,
  noteId,
});

console.log(linkId1 === linkId2); // Should be true (same link returned)
```

### 5. Test Bulk Operations

```typescript
const noteIds = [
  "<note-id-1>",
  "<note-id-2>",
  "<note-id-3>",
];

const results = await ctx.runMutation(api.projects.bulkAddNotesToProject, {
  projectId,
  noteIds,
});

console.log(results);
// Should show success/failure for each note
```

## Type Safety Pattern

```typescript
// Frontend
// @ts-ignore - Type depth exceeded
const addNote = useMutation(api.projects.addNoteToProject);

// Backend
const resources = ((await (ctx.runQuery as any)(
  // @ts-ignore
  internal.projects.getProjectResources,
  { projectId }
)) as {
  conversations: Doc<"conversations">[];
  notes: Doc<"notes">[];
  files: Doc<"files">[];
  tasks: Doc<"tasks">[];
});
```

## Troubleshooting

### Junction Not Created
- Check ownership (user must own both project and resource)
- Verify resource IDs are valid
- Check for existing link (duplicate prevention)

### Activity Event Missing
- Ensure event creation after junction insert
- Check projectId is passed correctly
- Verify eventType is valid enum value

### Resource Not Hydrated
- Check if resource was deleted
- Verify junction table has correct resourceId
- Filter out null values with `.filter(Boolean)`

## Success Criteria

- [ ] Can link/unlink notes to projects
- [ ] Can link/unlink files to projects
- [ ] `getProjectResources` returns all linked items
- [ ] Activity feed shows events in descending order
- [ ] Activity events created on link/unlink
- [ ] Duplicate links prevented
- [ ] Bulk operations work correctly
- [ ] Memory extraction links to projects
- [ ] Stats query returns correct counts
- [ ] All type errors resolved with `@ts-ignore`

## Next Phase

**Phase 4: File RAG System** - Build chunking, embeddings, and semantic search for project files

Project expansion backend complete. Files will be searchable via embeddings.

## Reference Files

- Junction pattern: `convex/projects.ts` lines 115-192
- Activity events schema: `convex/schema.ts` (activityEvents table)
- Memory extraction: `convex/memories/extract.ts`
- Resource hydration: Existing queries in `convex/projects.ts`
