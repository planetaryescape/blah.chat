# Phase 2: User Database Schema Package

## Context

### What is BYOD?

BYOD (Bring Your Own Database) allows users to connect their own Convex instance for storing personal content. Users get data ownership while we handle app operations on our main database.

### Overall Architecture

- **Main DB** (blah.chat's Convex): users, templates, adminSettings, feedback, shares
- **User's DB** (their Convex): conversations, messages, memories, files, projects, notes, tasks

### Where This Phase Fits

```
Phase 1: Foundation ✓
         │
         ▼
[Phase 2: Schema Package] ◄── YOU ARE HERE
         │
         ▼
Phase 3: Deployment
Phase 4: DAL Routing
Phase 5: Migrations
Phase 6: Settings UI
Phase 7: Error Handling
Phase 8: Documentation
```

**Dependencies**: Phase 1 (credential storage)
**Unlocks**: Phase 3 (deployment pipeline)

---

## Goal

Create a deployable schema package that can be deployed to user's Convex instances. This package contains all content tables with proper indexes and vector search capabilities.

---

## Deliverables

### 1. Version Tracking

Create `/src/lib/byod/version.ts`:

```typescript
export const BYOD_SCHEMA_VERSION = 1;

export const SCHEMA_CHANGELOG: Record<number, string> = {
  1: "Initial BYOD schema - conversations, messages, memories, files, projects, notes, tasks",
};

export function getSchemaVersion(): number {
  return BYOD_SCHEMA_VERSION;
}
```

### 2. Schema Definitions

Create `/src/lib/byod/schema/index.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { conversationsTable } from "./conversations";
import { messagesTable } from "./messages";
import { memoriesTable } from "./memories";
import { filesTable } from "./files";
import { projectsTable } from "./projects";
import { notesTable } from "./notes";
import { tasksTable } from "./tasks";
import { usageTable } from "./usage";
import { presentationsTable } from "./presentations";
import { tagsTable } from "./tags";
import { bookmarksTable } from "./bookmarks";

export const byodSchema = defineSchema({
  // Core content
  ...conversationsTable,
  ...messagesTable,
  ...memoriesTable,

  // Files
  ...filesTable,

  // Organization
  ...projectsTable,
  ...notesTable,
  ...tasksTable,
  ...bookmarksTable,
  ...tagsTable,

  // Usage tracking
  ...usageTable,

  // Presentations
  ...presentationsTable,
});

export default byodSchema;
```

Create `/src/lib/byod/schema/conversations.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const conversationsTable = {
  conversations: defineTable({
    userId: v.string(), // Clerk user ID (not Convex ID since main DB has users)
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    lastMessageAt: v.optional(v.number()),
    messageCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "isArchived"])
    .index("by_user_pinned", ["userId", "isPinned"])
    .index("by_user_last_message", ["userId", "lastMessageAt"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  conversationParticipants: defineTable({
    conversationId: v.id("conversations"),
    clerkId: v.string(),
    role: v.union(v.literal("owner"), v.literal("collaborator"), v.literal("viewer")),
    joinedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["clerkId"])
    .index("by_conversation_user", ["conversationId", "clerkId"]),
};
```

Create `/src/lib/byod/schema/messages.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const messagesTable = {
  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(), // Clerk user ID
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    model: v.optional(v.string()),

    // Generation state
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("complete"),
      v.literal("error"),
      v.literal("stopped")
    )),
    partialContent: v.optional(v.string()),
    error: v.optional(v.string()),
    generationStartedAt: v.optional(v.number()),
    generationCompletedAt: v.optional(v.number()),

    // Token tracking
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cost: v.optional(v.number()),

    // Branching
    parentMessageId: v.optional(v.id("messages")),
    branchIndex: v.optional(v.number()),

    // Metadata
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"])
    .index("by_user", ["userId"])
    .index("by_parent", ["parentMessageId"])
    .index("by_status", ["status"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "conversationId"],
    })
    .vectorIndex("embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "conversationId"],
    }),

  // Tool calls made during generation
  toolCalls: defineTable({
    messageId: v.id("messages"),
    toolName: v.string(),
    toolArgs: v.any(),
    result: v.optional(v.any()),
    status: v.union(v.literal("pending"), v.literal("complete"), v.literal("error")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"]),

  // Sources cited in responses
  sources: defineTable({
    messageId: v.id("messages"),
    url: v.string(),
    title: v.optional(v.string()),
    snippet: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"]),

  // Attachments on messages
  attachments: defineTable({
    messageId: v.id("messages"),
    userId: v.string(),
    storageId: v.optional(v.id("_storage")),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    url: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId"]),
};
```

Create `/src/lib/byod/schema/memories.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const memoriesTable = {
  memories: defineTable({
    userId: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    source: v.optional(v.union(
      v.literal("extracted"),
      v.literal("manual"),
      v.literal("imported")
    )),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceMessageId: v.optional(v.id("messages")),
    importance: v.optional(v.number()), // 0-1 score
    embedding: v.optional(v.array(v.float64())),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_user_category", ["userId", "category"])
    .index("by_source_conversation", ["sourceConversationId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "category"],
    })
    .vectorIndex("embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "category", "isActive"],
    }),
};
```

Create `/src/lib/byod/schema/files.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const filesTable = {
  files: defineTable({
    userId: v.string(),
    storageId: v.optional(v.id("_storage")),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    url: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    )),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  fileChunks: defineTable({
    fileId: v.id("files"),
    userId: v.string(),
    chunkIndex: v.number(),
    content: v.string(),
    embedding: v.optional(v.array(v.float64())),
    createdAt: v.number(),
  })
    .index("by_file", ["fileId"])
    .index("by_user", ["userId"])
    .vectorIndex("embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "fileId"],
    }),
};
```

Create `/src/lib/byod/schema/projects.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const projectsTable = {
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "isArchived"]),

  projectConversations: defineTable({
    projectId: v.id("projects"),
    conversationId: v.id("conversations"),
    addedAt: v.number(),
    addedBy: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_conversation", ["conversationId"])
    .index("by_project_conversation", ["projectId", "conversationId"]),

  projectNotes: defineTable({
    projectId: v.id("projects"),
    noteId: v.id("notes"),
    addedAt: v.number(),
    addedBy: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_note", ["noteId"]),

  projectFiles: defineTable({
    projectId: v.id("projects"),
    fileId: v.id("files"),
    addedAt: v.number(),
    addedBy: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_file", ["fileId"]),
};
```

Create `/src/lib/byod/schema/notes.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const notesTable = {
  notes: defineTable({
    userId: v.string(),
    title: v.string(),
    content: v.string(), // Markdown
    isPinned: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_pinned", ["userId", "isPinned"])
    .index("by_user_archived", ["userId", "isArchived"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    }),
};
```

Create `/src/lib/byod/schema/tasks.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tasksTable = {
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("cancelled")
    ),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    )),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceMessageId: v.optional(v.id("messages")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_due", ["userId", "dueDate"])
    .index("by_source_conversation", ["sourceConversationId"]),
};
```

Create `/src/lib/byod/schema/bookmarks.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const bookmarksTable = {
  bookmarks: defineTable({
    userId: v.string(),
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId"]),

  snippets: defineTable({
    userId: v.string(),
    title: v.string(),
    content: v.string(),
    language: v.optional(v.string()),
    sourceMessageId: v.optional(v.id("messages")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_source", ["sourceMessageId"]),
};
```

Create `/src/lib/byod/schema/tags.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tagsTable = {
  tags: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.optional(v.string()),
    scope: v.union(v.literal("user"), v.literal("global")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_name", ["name"]),

  // Tag junctions
  conversationTags: defineTable({
    conversationId: v.id("conversations"),
    tagId: v.id("tags"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_tag", ["tagId"]),

  noteTags: defineTable({
    noteId: v.id("notes"),
    tagId: v.id("tags"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_tag", ["tagId"]),

  taskTags: defineTable({
    taskId: v.id("tasks"),
    tagId: v.id("tags"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_tag", ["tagId"]),
};
```

Create `/src/lib/byod/schema/usage.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const usageTable = {
  usageRecords: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    requestCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_model", ["userId", "model"]),

  // TTS cache
  ttsCache: defineTable({
    hash: v.string(), // Hash of text + voice + settings
    storageId: v.id("_storage"),
    text: v.string(),
    voice: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_hash", ["hash"])
    .index("by_expires", ["expiresAt"]),
};
```

Create `/src/lib/byod/schema/presentations.ts`:

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const presentationsTable = {
  presentations: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    theme: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("ready"),
      v.literal("presenting")
    ),
    sourceConversationId: v.optional(v.id("conversations")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  slides: defineTable({
    presentationId: v.id("presentations"),
    userId: v.string(),
    order: v.number(),
    type: v.union(
      v.literal("title"),
      v.literal("content"),
      v.literal("image"),
      v.literal("code"),
      v.literal("split")
    ),
    content: v.any(), // Slide-type specific content
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_presentation", ["presentationId"])
    .index("by_presentation_order", ["presentationId", "order"]),

  outlineItems: defineTable({
    presentationId: v.id("presentations"),
    userId: v.string(),
    order: v.number(),
    title: v.string(),
    content: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_presentation", ["presentationId"]),

  designTemplates: defineTable({
    userId: v.string(),
    name: v.string(),
    config: v.any(), // Theme configuration
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  presentationSessions: defineTable({
    presentationId: v.id("presentations"),
    userId: v.string(),
    currentSlide: v.number(),
    isActive: v.boolean(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_presentation", ["presentationId"])
    .index("by_user_active", ["userId", "isActive"]),
};
```

### 3. Schema Generator Utility

Create `/src/lib/byod/schemaGenerator.ts`:

```typescript
import { BYOD_SCHEMA_VERSION } from "./version";

/**
 * Generates the schema.ts file content for deployment to user instances
 */
export function generateSchemaFile(): string {
  return `// Auto-generated BYOD schema v${BYOD_SCHEMA_VERSION}
// DO NOT EDIT - This file is managed by blah.chat

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // [Full schema content here - generated from schema definitions]
});
`;
}

/**
 * Generates the convex.config.ts file content
 */
export function generateConfigFile(): string {
  return `// Auto-generated BYOD config v${BYOD_SCHEMA_VERSION}
import { defineApp } from "convex/server";

const app = defineApp();

export default app;
`;
}
```

---

## Files to Create

| File | Description |
|------|-------------|
| `/src/lib/byod/version.ts` | Schema version tracking |
| `/src/lib/byod/schema/index.ts` | Combined schema export |
| `/src/lib/byod/schema/conversations.ts` | Conversation + participants |
| `/src/lib/byod/schema/messages.ts` | Messages + tools + sources + attachments |
| `/src/lib/byod/schema/memories.ts` | RAG memory system |
| `/src/lib/byod/schema/files.ts` | Files + chunks |
| `/src/lib/byod/schema/projects.ts` | Projects + junctions |
| `/src/lib/byod/schema/notes.ts` | Notes table |
| `/src/lib/byod/schema/tasks.ts` | Tasks table |
| `/src/lib/byod/schema/bookmarks.ts` | Bookmarks + snippets |
| `/src/lib/byod/schema/tags.ts` | Tags + junctions |
| `/src/lib/byod/schema/usage.ts` | Usage records + TTS cache |
| `/src/lib/byod/schema/presentations.ts` | Presentations subsystem |
| `/src/lib/byod/schemaGenerator.ts` | Generate deployable files |

---

## Testing Criteria

- [ ] Schema exports valid Convex schema object
- [ ] All content tables included (check against main schema)
- [ ] Vector indexes defined correctly (1536 dimensions)
- [ ] Search indexes defined with correct filter fields
- [ ] All foreign key relationships have indexes
- [ ] Schema version increments with changes
- [ ] No circular dependencies in imports

---

## Key Differences from Main Schema

1. **userId is string (Clerk ID)** - Not `v.id("users")` since users table is on main DB
2. **No users table** - Managed by main DB
3. **No admin tables** - adminSettings, feedback, templates stay on main
4. **Self-contained** - All referenced tables exist within schema

---

## Next Phase

After completing Phase 2, proceed to [Phase 3: Deployment Pipeline](./phase-3-deployment.md) to deploy this schema to user's Convex instances.
