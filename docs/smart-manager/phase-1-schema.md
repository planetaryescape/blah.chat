# Phase 1: Database Schema & Foundation

## Overview

This phase establishes the database foundation for Smart Manager by adding 6 new tables and extending 1 existing table. All subsequent phases depend on this schema.

**Duration**: 1-2 days
**Dependencies**: None (starting point)
**Output**: Schema deployed, migrations complete

## Context: What We're Building

**Smart Manager** adds two features to blah.chat:

1. **Smart Assistant**: Upload meeting audio/transcripts → AI extracts tasks with smart deadlines
2. **Expanded Projects**: Link conversations, files, notes, tasks → full workspace hubs with RAG

This phase creates the data layer for both features.

## Existing Infrastructure

### Convex Database
- Real-time reactive queries
- Built-in vector search for embeddings
- Strong typing via `schema.ts`
- Junction tables for many-to-many (already used for `projectConversations`)

### Existing Tables to Know
- **`projects`**: userId, name, description, systemPrompt, isTemplate
- **`conversations`**: userId, projectId (optional single link)
- **`projectConversations`**: Junction table (Phase 3 migration complete)
- **`notes`**: userId, title, content, tags (array + junction via `noteTags`)
- **`files`**: userId, conversationId, storageId, name, mimeType, size
- **`tags`**: Centralized tags with `noteTags`, `bookmarkTags`, `snippetTags` junctions
- **`memories`**: userId, content, embedding, category, importance, confidence

### Existing Patterns
- **Junction tables**: Many-to-many with userId, addedAt for audit
- **Vector indexes**: 1536-dim for text-embedding-3-small
- **Search indexes**: Full-text with filterFields
- **Dual-write migration**: Junction + legacy field during transitions

## Schema Changes

### 1. Tasks Table

**Purpose**: Standalone tasks with optional project links

```typescript
// convex/schema.ts

tasks: defineTable({
  // Ownership
  userId: v.id("users"),

  // Core fields
  title: v.string(),
  description: v.optional(v.string()),
  status: v.union(
    v.literal("suggested"),    // AI extracted, not confirmed
    v.literal("confirmed"),     // User confirmed
    v.literal("in_progress"),   // Actively working
    v.literal("completed"),     // Done
    v.literal("cancelled")      // Won't do
  ),

  // Deadline fields
  deadline: v.optional(v.number()),        // Unix timestamp
  deadlineSource: v.optional(v.string()),  // "next Friday", "ASAP" (for transparency)
  urgency: v.optional(v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("urgent")
  )),

  // Source tracking
  sourceType: v.optional(v.union(
    v.literal("transcript"),   // From Smart Assistant
    v.literal("conversation"), // From chat
    v.literal("manual"),       // User created
    v.literal("file")          // From document
  )),
  sourceId: v.optional(v.string()), // Link to transcript/conversation/file
  sourceContext: v.optional(v.object({
    snippet: v.string(),              // Text snippet where task mentioned
    timestamp: v.optional(v.number()), // For audio/video sources
    confidence: v.optional(v.number()) // AI confidence (0-1)
  })),

  // Project link
  projectId: v.optional(v.id("projects")),

  // Ordering
  priority: v.optional(v.number()),   // User-defined priority
  position: v.optional(v.number()),   // For drag-drop ordering (future)

  // Future permissions
  visibility: v.optional(v.union(
    v.literal("private"),
    v.literal("team")  // Future: team sharing
  )),

  // Timestamps
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"])
  .index("by_user_deadline", ["userId", "deadline"])
  .index("by_project", ["projectId"])
  .index("by_user_project", ["userId", "projectId"])
  .searchIndex("search_title", {
    searchField: "title",
    filterFields: ["userId", "status"]
  })
```

**Indexes Explained**:
- `by_user`: List all user's tasks
- `by_user_status`: Filter by status (e.g., "Show completed")
- `by_user_deadline`: Sort by deadline for "Upcoming" view
- `by_project`: Project detail page task list
- `by_user_project`: Filter tasks by project
- `search_title`: Full-text search with status filter

### 2. Project Notes Junction Table

**Purpose**: Link notes to projects (many-to-many)

```typescript
projectNotes: defineTable({
  projectId: v.id("projects"),
  noteId: v.id("notes"),
  userId: v.id("users"),      // For future permissions
  addedAt: v.number(),         // Audit trail
})
  .index("by_project", ["projectId"])
  .index("by_note", ["noteId"])
  .index("by_user_project", ["userId", "projectId"])
```

**Pattern**: Follows existing `projectConversations` structure

### 3. Project Files Junction Table

**Purpose**: Link files to projects (many-to-many)

```typescript
projectFiles: defineTable({
  projectId: v.id("projects"),
  fileId: v.id("files"),
  userId: v.id("users"),
  addedAt: v.number(),
})
  .index("by_project", ["projectId"])
  .index("by_file", ["fileId"])
  .index("by_user_project", ["userId", "projectId"])
```

### 4. File Chunks Table (RAG)

**Purpose**: Store document chunks with embeddings for semantic search

```typescript
fileChunks: defineTable({
  fileId: v.id("files"),
  userId: v.id("users"),
  chunkIndex: v.number(),      // 0, 1, 2... (order in document)
  content: v.string(),         // Chunk text content

  // Metadata for context
  metadata: v.object({
    startPage: v.optional(v.number()),   // PDF page start
    endPage: v.optional(v.number()),     // PDF page end
    section: v.optional(v.string()),     // Section/chapter title
    charOffset: v.number(),              // Character offset in original
    tokenCount: v.number(),              // Approx tokens in chunk
  }),

  // Vector embedding (1536-dim for text-embedding-3-small)
  embedding: v.array(v.float64()),

  createdAt: v.number(),
})
  .index("by_file", ["fileId"])
  .index("by_user", ["userId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["userId", "fileId"]  // Scope search to user/file
  })
```

**Key Design**:
- Vector index enables semantic search
- Metadata preserves document structure
- Filter by fileId to search specific documents

### 5. Activity Events Table

**Purpose**: Project activity feed

```typescript
activityEvents: defineTable({
  userId: v.id("users"),
  projectId: v.optional(v.id("projects")), // null = global activity

  eventType: v.union(
    v.literal("task_created"),
    v.literal("task_completed"),
    v.literal("note_linked"),
    v.literal("file_uploaded"),
    v.literal("conversation_linked"),
    v.literal("memory_extracted")
  ),

  resourceType: v.string(),    // "task", "note", "file", etc.
  resourceId: v.string(),      // ID of resource

  metadata: v.optional(v.any()), // Event-specific data (flexible)

  createdAt: v.number(),
})
  .index("by_user", ["userId", "createdAt"])
  .index("by_project", ["projectId", "createdAt"])
```

**Usage**:
- Project overview: Recent activity
- Global feed: All user activity
- Ordered by `createdAt` (descending)

### 6. Task Tags Junction Table

**Purpose**: Link tasks to tags (reuse existing tag system)

```typescript
taskTags: defineTable({
  taskId: v.id("tasks"),
  tagId: v.id("tags"),
  userId: v.id("users"),
  addedAt: v.number(),
})
  .index("by_task", ["taskId"])
  .index("by_tag", ["tagId"])
  .index("by_user", ["userId"])
```

**Integration**: Tasks use same centralized tags as notes, bookmarks, snippets

### 7. Extend Files Table

**Purpose**: Track embedding status for RAG

```typescript
// Add to existing files table:
files: defineTable({
  // ... existing fields (userId, conversationId, storageId, name, mimeType, size, createdAt)

  // NEW: RAG metadata
  chunkCount: v.optional(v.number()),
  embeddingStatus: v.optional(v.union(
    v.literal("pending"),      // Queued for processing
    v.literal("processing"),   // Currently embedding
    v.literal("completed"),    // Ready for search
    v.literal("failed")        // Error occurred
  )),
  embeddingError: v.optional(v.string()),
  processedAt: v.optional(v.number()),
})
// ... existing indexes unchanged
```

## Implementation Steps

### Step 1: Backup Current Schema

```bash
# Copy current schema for reference
cp convex/schema.ts convex/schema.backup.ts
```

### Step 2: Add New Tables

Open `convex/schema.ts` and add tables in order:

1. Add `tasks` table (around line 900, after existing tables)
2. Add `projectNotes` junction (after `projectConversations`)
3. Add `projectFiles` junction
4. Add `fileChunks` table
5. Add `activityEvents` table
6. Add `taskTags` junction (near other tag junctions)

### Step 3: Extend Files Table

Locate `files` table definition and add new optional fields:
- `chunkCount`
- `embeddingStatus`
- `embeddingError`
- `processedAt`

### Step 4: Deploy Schema

```bash
# Convex auto-deploys schema on save
# Check dashboard for deployment status
# Verify all indexes created
```

### Step 5: Verify in Dashboard

1. Open Convex dashboard
2. Check "Data" tab → should see new tables
3. Verify indexes created for each table
4. Check vector index on `fileChunks.by_embedding`

## Type Safety Pattern

With 94+ Convex modules, use these patterns:

```typescript
// Frontend - @ts-ignore on hooks
// @ts-ignore - Type depth exceeded with complex Convex mutation
const createTask = useMutation(api.tasks.createTask);

// Backend - cast + @ts-ignore on internal calls
const result = ((await (ctx.runQuery as any)(
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.tasks.getTaskById,
  { taskId }
)) as Doc<"tasks"> | null);
```

## Migration Considerations

### No Breaking Changes
- All new tables are additive
- `files` table extensions are optional fields
- Existing data unaffected

### Future Migrations (if needed)
Create `convex/migrations/008_smart_manager_backfill.ts`:

```typescript
import { internalMutation } from "./_generated/server";

export const backfillTaskDefaults = internalMutation({
  handler: async (ctx) => {
    // Example: Add default fields to existing tasks
    const tasks = await ctx.db.query("tasks").collect();

    for (const task of tasks) {
      if (!task.createdAt) {
        await ctx.db.patch(task._id, {
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  },
});
```

## Testing After Deployment

### Manual Tests

1. **Tasks Table**:
   ```typescript
   // In Convex dashboard Functions tab
   await ctx.db.insert("tasks", {
     userId: "<your-user-id>",
     title: "Test task",
     status: "confirmed",
     createdAt: Date.now(),
     updatedAt: Date.now(),
   });
   ```

2. **Junction Tables**:
   ```typescript
   await ctx.db.insert("projectNotes", {
     projectId: "<project-id>",
     noteId: "<note-id>",
     userId: "<user-id>",
     addedAt: Date.now(),
   });
   ```

3. **Activity Events**:
   ```typescript
   await ctx.db.insert("activityEvents", {
     userId: "<user-id>",
     projectId: "<project-id>",
     eventType: "task_created",
     resourceType: "task",
     resourceId: "<task-id>",
     createdAt: Date.now(),
   });
   ```

### Query Tests

```typescript
// List user tasks
await ctx.db
  .query("tasks")
  .withIndex("by_user", (q) => q.eq("userId", "<user-id>"))
  .collect();

// Get project notes
await ctx.db
  .query("projectNotes")
  .withIndex("by_project", (q) => q.eq("projectId", "<project-id>"))
  .collect();

// Search file chunks (requires embeddings in Phase 4)
await ctx.db
  .query("fileChunks")
  .withIndex("by_embedding", (q) => q.eq("userId", "<user-id>"))
  .collect();
```

## Troubleshooting

### Schema Deployment Fails
- Check for syntax errors in `schema.ts`
- Verify all imports at top of file
- Ensure no duplicate table names
- Check Convex dashboard logs

### Type Errors
- Add `@ts-ignore` comments as shown above
- Ensure using `v.` for all validators (not bare types)
- Check closing brackets/parentheses

### Index Not Created
- Verify index name is unique
- Check field names match table definition
- Wait 30s for deployment to complete
- Refresh Convex dashboard

## Success Criteria

- [ ] All 6 new tables visible in Convex dashboard
- [ ] All indexes created and visible
- [ ] Vector index on `fileChunks.by_embedding` created
- [ ] `files` table shows new optional fields
- [ ] Can manually insert test records
- [ ] Can query with indexes
- [ ] No TypeScript errors (with `@ts-ignore` where needed)
- [ ] No deployment errors in Convex logs

## Next Phase

**Phase 2: Tasks Backend** - Build CRUD operations, task extraction, auto-tagging

Schema is complete. Backend operations will use these tables.

## Reference Files

- Existing schema: `convex/schema.ts`
- Phase 3 project migration: `docs/migration/phase-3-project-relationships.md`
- Junction pattern: `convex/projects.ts` lines 473-481 (`projectConversations`)
- Vector index pattern: `convex/schema.ts` lines 222-230 (`memories.by_embedding`)
