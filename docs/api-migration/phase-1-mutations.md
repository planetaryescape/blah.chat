# Phase 1: Mutations - Write Operations API

> **⚠️ Implementation Status: NOT STARTED (0%)**
> No REST mutation endpoints exist. All writes currently use Convex mutations directly via `useMutation` hooks. Frontend has 223 Convex hook calls across 63 components. Schema has 40+ tables requiring migration.

## Overview

Migrate all write operations (create, update, delete) from Convex mutations to REST API endpoints. Start with chat (highest priority), then preferences and metadata.

## Context & Grand Scope

### Why This Phase Exists
Mobile apps need reliable write operations. Mutations are the critical path - users create conversations, send messages, update settings. Phase 1 ensures all writes work via HTTP POST/PATCH/DELETE before tackling reads (Phase 3).

### Dependencies
- **Previous phases**: Phase 0 (foundation infrastructure) ✅
- **Blocks**: Phase 2 (React Query integration), Phase 5 (real-time updates)
- **Critical path**: Chat mutations must work before mobile app can function

## Research & Decision Rationale

### Industry Patterns Analyzed

**1. REST Verb Semantics**
- POST: Create new resource
- PATCH: Partial update (preferred over PUT)
- DELETE: Remove resource
- blah.chat follows standard REST conventions

**2. Idempotency**
- POST: Not idempotent (creates new each time)
- PATCH/DELETE: Idempotent (safe to retry)
- Pattern: Return existing ID on duplicate POST (conversation titles)

**3. Optimistic Updates**
- Client shows change immediately
- Server validates and persists
- On failure: rollback UI state
- React Query handles this automatically with `useMutation`

**4. Async Processing**
- Long operations (LLM generation): Return 202 Accepted
- Short operations (update title): Return 200 OK
- Pattern: Separate mutation (instant) from action (long-running)

### Decisions Made

**Decision 1: Prioritize Chat Mutations**
- Order: messages > conversations > preferences > metadata
- Rationale: Messages are 80% of writes, block mobile MVP

**Decision 2: Separate Message Creation from Generation**
- POST /messages: Creates message record (instant)
- Generation happens via Convex action (unchanged in Phase 1)
- Rationale: Resilient generation pattern stays server-side for now

**Decision 3: Use PATCH for Updates**
- PATCH allows partial updates (just changed fields)
- PUT requires full replacement (unnecessary bandwidth)
- Example: Update just conversation title, not entire object

**Decision 4: Soft Deletes by Default**
- DELETE sets `deletedAt` timestamp
- Hard delete requires `?permanent=true`
- Rationale: User recovery, audit trails

## Current State Analysis

### How blah.chat Works Today

**1. Message Creation**
```typescript
// src/components/chat/ChatInput.tsx:120-135
const sendMessage = useMutation(api.chat.send);

const handleSubmit = async () => {
  await sendMessage({
    conversationId,
    content,
    attachments,
    modelId,
  });
};
```

Convex mutation calls:
```typescript
// convex/chat.ts:45-120
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    attachments: v.optional(v.array(v.object({ ... }))),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert user message
    const messageId = await ctx.db.insert("messages", { ... });

    // Schedule generation action
    await ctx.scheduler.runAfter(0, internal.generation.generate, { ... });

    return messageId;
  },
});
```

**2. Conversation Management**
```typescript
// src/components/sidebar/app-sidebar.tsx:85-90
const createConversation = useMutation(api.conversations.create);

const handleNew = async () => {
  const id = await createConversation({
    title: "New Conversation",
    modelId: "openai:gpt-4o",
  });
  router.push(`/chat/${id}`);
};
```

**3. Update Operations**
```typescript
// src/components/chat/ConversationHeaderMenu.tsx:45-60
const updateConversation = useMutation(api.conversations.update);

const handleRename = async (title: string) => {
  await updateConversation({
    id: conversationId,
    title,
  });
};
```

**4. Delete Operations**
```typescript
// src/components/sidebar/app-sidebar.tsx:120-125
const deleteConversation = useMutation(api.conversations.delete);

const handleDelete = async (id: Id<"conversations">) => {
  await deleteConversation({ id });
};
```

### Specific Files/Patterns

**Current Mutation Landscape** (verified 2025-12-12):
- **Total Convex hooks**: 223 `useMutation` calls across codebase
- **Components affected**: 63 files
- **Tables with mutations**: 40+ (conversations, messages, users, projects, memories, bookmarks, etc.)
- **Zero REST endpoints**: All mutations currently via Convex

**Key Components Using Mutations**:
1. Chat operations (messages, attachments, comparisons)
2. Conversation management (create, update, delete, archive)
3. User preferences (40+ settings in normalized userPreferences table)
4. Project management (projects, tasks, notes)
5. Memory system (facts, embeddings)
6. Bookmarks, templates, scheduled prompts

**Convex mutations to migrate** (from `convex/`):
1. `chat.ts` - `send`, `edit`, `delete`, `regenerate`
2. `conversations.ts` - `create`, `update`, `delete`, `archive`
3. `messages.ts` - `update`, `delete`, `react`
4. `preferences.ts` - `update`, `setTheme`, `setModel`
5. `bookmarks.ts` - `create`, `delete`
6. `projects.ts` - `create`, `update`, `delete`, `addConversation`
7. `memories.ts` - `create`, `update`, `delete`
8. `shares.ts` - `create`, `delete`

**Total mutations identified**: 28 across 8 domains

## Target State

### What We're Building

```
src/
├── lib/api/dal/
│   ├── conversations.ts    # DAL for conversations CRUD
│   ├── messages.ts         # DAL for messages CRUD
│   ├── preferences.ts      # DAL for user preferences
│   ├── bookmarks.ts        # DAL for bookmarks CRUD
│   └── projects.ts         # DAL for projects CRUD
├── app/api/v1/
│   ├── conversations/
│   │   ├── route.ts                  # POST /conversations
│   │   └── [id]/
│   │       ├── route.ts              # PATCH /conversations/:id, DELETE
│   │       └── messages/
│   │           └── route.ts          # POST /conversations/:id/messages
│   ├── messages/
│   │   └── [id]/
│   │       └── route.ts              # PATCH /messages/:id, DELETE
│   ├── preferences/
│   │   └── route.ts                  # PATCH /preferences
│   ├── bookmarks/
│   │   ├── route.ts                  # POST /bookmarks
│   │   └── [id]/
│   │       └── route.ts              # DELETE /bookmarks/:id
│   └── projects/
│       ├── route.ts                  # POST /projects
│       └── [id]/
│           ├── route.ts              # PATCH /projects/:id, DELETE
│           └── conversations/
│               └── route.ts          # POST /projects/:id/conversations
```

### Success Looks Like

**1. Create Conversation**
```bash
POST /api/v1/conversations
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "New Chat",
  "modelId": "openai:gpt-4o"
}
```

Response:
```json
{
  "status": "success",
  "sys": {
    "entity": "conversation",
    "id": "j97x...",
    "timestamps": {
      "created": "2025-12-10T12:00:00.000Z",
      "retrieved": "2025-12-10T12:00:00.000Z"
    }
  },
  "data": {
    "_id": "j97x...",
    "userId": "user_abc",
    "title": "New Chat",
    "modelId": "openai:gpt-4o",
    "createdAt": 1702209600000,
    "updatedAt": 1702209600000
  }
}
```

**2. Send Message**
```bash
POST /api/v1/conversations/j97x.../messages
Content-Type: application/json

{
  "content": "Hello, world!",
  "attachments": [],
  "modelId": "openai:gpt-4o"
}
```

Response (202 Accepted - generation happens async):
```json
{
  "status": "success",
  "sys": {
    "entity": "message",
    "id": "k12y...",
    "timestamps": {
      "created": "2025-12-10T12:00:01.000Z"
    }
  },
  "data": {
    "_id": "k12y...",
    "conversationId": "j97x...",
    "role": "user",
    "content": "Hello, world!",
    "status": "pending",
    "createdAt": 1702209601000
  }
}
```

**3. Update Conversation**
```bash
PATCH /api/v1/conversations/j97x...
Content-Type: application/json

{
  "title": "Renamed Chat"
}
```

**4. Delete Message**
```bash
DELETE /api/v1/messages/k12y...
```

Response (204 No Content)

## Implementation Steps

### Step 1: Create Conversations DAL

**Goal**: Centralize conversation CRUD operations

**Action**: Wrap Convex mutations in DAL layer

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/dal/conversations.ts`

**Code**:
```typescript
// src/lib/api/dal/conversations.ts
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export interface CreateConversationInput {
  title?: string;
  modelId: string;
  projectId?: Id<"projects">;
}

export interface UpdateConversationInput {
  title?: string;
  modelId?: string;
  archived?: boolean;
}

export const conversationsDAL = {
  /**
   * Create new conversation
   */
  async create(userId: string, input: CreateConversationInput) {
    // Use Convex mutation internally
    const id = ((await (fetchMutation as any)(
      api.conversations.create,
      {
        ...input,
        userId, // Pass userId from auth context
      }
    )) as Id<"conversations">);

    // Fetch full object to return
    return this.getById(id, userId);
  },

  /**
   * Get conversation by ID (verify ownership)
   */
  async getById(id: Id<"conversations">, userId: string) {
    const conversation = await fetchQuery(api.conversations.getById, { id });

    if (!conversation) {
      return null;
    }

    // Verify ownership
    if (conversation.userId !== userId) {
      throw new Error("Access denied");
    }

    return conversation;
  },

  /**
   * Update conversation
   */
  async update(
    id: Id<"conversations">,
    userId: string,
    input: UpdateConversationInput
  ) {
    // Verify ownership first
    await this.getById(id, userId);

    // Update via Convex
    await fetchMutation(api.conversations.update, {
      id,
      ...input,
    });

    // Return updated object
    return this.getById(id, userId);
  },

  /**
   * Delete conversation (soft delete)
   */
  async delete(id: Id<"conversations">, userId: string, permanent = false) {
    // Verify ownership
    await this.getById(id, userId);

    if (permanent) {
      // Hard delete (use with caution)
      await fetchMutation(api.conversations.deletePermanent, { id });
      return { deleted: true, permanent: true };
    }

    // Soft delete
    await fetchMutation(api.conversations.delete, { id });
    return { deleted: true, permanent: false };
  },

  /**
   * Archive conversation
   */
  async archive(id: Id<"conversations">, userId: string) {
    return this.update(id, userId, { archived: true });
  },

  /**
   * List conversations (paginated)
   */
  async list(userId: string, page = 1, pageSize = 20) {
    return fetchQuery(api.conversations.list, {
      userId,
      page,
      pageSize,
    });
  },

  /**
   * Count total conversations
   */
  async count(userId: string) {
    return fetchQuery(api.conversations.count, { userId });
  },
};

// Type exports
export type Conversation = Awaited<
  ReturnType<typeof conversationsDAL.getById>
>;
```

### Step 2: Create Messages DAL

**Goal**: Centralize message CRUD operations

**Action**: Wrap message mutations

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/dal/messages.ts`

**Code**:
```typescript
// src/lib/api/dal/messages.ts
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export interface SendMessageInput {
  conversationId: Id<"conversations">;
  content: string;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    size: number;
  }>;
  modelId: string;
  parentId?: Id<"messages">; // For branching
}

export interface UpdateMessageInput {
  content?: string;
  status?: "pending" | "generating" | "complete" | "error";
  error?: string;
}

export const messagesDAL = {
  /**
   * Send new message (creates user message + triggers generation)
   */
  async send(userId: string, input: SendMessageInput) {
    // Verify user owns conversation
    const conversation = await fetchQuery(api.conversations.getById, {
      id: input.conversationId,
    });

    if (!conversation || conversation.userId !== userId) {
      throw new Error("Access denied");
    }

    // Send via Convex (triggers generation action)
    const messageId = ((await (fetchMutation as any)(
      api.chat.send,
      input
    )) as Id<"messages">);

    // Return created message
    return this.getById(messageId, userId);
  },

  /**
   * Get message by ID (verify ownership via conversation)
   */
  async getById(id: Id<"messages">, userId: string) {
    const message = await fetchQuery(api.messages.getById, { id });

    if (!message) {
      return null;
    }

    // Verify ownership via conversation
    const conversation = await fetchQuery(api.conversations.getById, {
      id: message.conversationId,
    });

    if (!conversation || conversation.userId !== userId) {
      throw new Error("Access denied");
    }

    return message;
  },

  /**
   * Update message (edit content or status)
   */
  async update(id: Id<"messages">, userId: string, input: UpdateMessageInput) {
    // Verify ownership
    await this.getById(id, userId);

    // Update via Convex
    await fetchMutation(api.messages.update, {
      id,
      ...input,
    });

    return this.getById(id, userId);
  },

  /**
   * Delete message (soft delete)
   */
  async delete(id: Id<"messages">, userId: string, permanent = false) {
    // Verify ownership
    await this.getById(id, userId);

    if (permanent) {
      await fetchMutation(api.messages.deletePermanent, { id });
      return { deleted: true, permanent: true };
    }

    await fetchMutation(api.messages.delete, { id });
    return { deleted: true, permanent: false };
  },

  /**
   * Regenerate assistant response
   */
  async regenerate(
    messageId: Id<"messages">,
    userId: string,
    modelId?: string
  ) {
    // Verify ownership
    const message = await this.getById(messageId, userId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Regenerate via Convex (triggers new generation)
    const newMessageId = ((await (fetchMutation as any)(
      api.chat.regenerate,
      {
        messageId,
        modelId,
      }
    )) as Id<"messages">);

    return this.getById(newMessageId, userId);
  },

  /**
   * List messages for conversation
   */
  async list(conversationId: Id<"conversations">, userId: string) {
    // Verify ownership
    const conversation = await fetchQuery(api.conversations.getById, {
      id: conversationId,
    });

    if (!conversation || conversation.userId !== userId) {
      throw new Error("Access denied");
    }

    return fetchQuery(api.messages.list, { conversationId });
  },
};

// Type exports
export type Message = Awaited<ReturnType<typeof messagesDAL.getById>>;
```

### Step 3: Create Preferences DAL

**Goal**: User settings management

**Action**: Wrap preferences mutations

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/dal/preferences.ts`

**Code**:
```typescript
// src/lib/api/dal/preferences.ts
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export interface UpdatePreferencesInput {
  theme?: "light" | "dark" | "system";
  defaultModelId?: string;
  language?: string;
  sendOnEnter?: boolean;
  showTimestamps?: boolean;
  codeTheme?: string;
}

export const preferencesDAL = {
  /**
   * Get user preferences
   */
  async get(userId: string) {
    return fetchQuery(api.preferences.get, { userId });
  },

  /**
   * Update preferences (partial)
   */
  async update(userId: string, input: UpdatePreferencesInput) {
    await fetchMutation(api.preferences.update, {
      userId,
      ...input,
    });

    return this.get(userId);
  },

  /**
   * Reset to defaults
   */
  async reset(userId: string) {
    await fetchMutation(api.preferences.reset, { userId });
    return this.get(userId);
  },
};

// Type exports
export type Preferences = Awaited<ReturnType<typeof preferencesDAL.get>>;
```

### Step 4: Create Conversation Routes

**Goal**: REST API for conversation CRUD

**Action**: Implement POST/PATCH/DELETE endpoints

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/conversations/route.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/conversations/[id]/route.ts`

**Code**:
```typescript
// src/app/api/v1/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { parseBody, getPaginationParams, buildPaginatedResponse } from "@/lib/api/utils";
import { errors } from "@/lib/api/middleware/errors";
import type { Id } from "@/convex/_generated/dataModel";

// Validation schema
const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  modelId: z.string().min(1),
  projectId: z.string().optional() as z.ZodType<Id<"projects"> | undefined>,
});

/**
 * POST /api/v1/conversations
 * Create new conversation
 */
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);

  // Validate
  const result = createConversationSchema.safeParse(body);
  if (!result.success) {
    throw errors.validation("Invalid request", result.error.flatten());
  }

  // Create
  const conversation = await conversationsDAL.create(userId, result.data);

  return NextResponse.json(
    formatEntity(conversation, "conversation", conversation._id),
    { status: 201 }
  );
});

/**
 * GET /api/v1/conversations
 * List conversations (paginated)
 */
export const GET = withAuth(async (req, { userId }) => {
  const { page, pageSize } = getPaginationParams(req);

  const conversations = await conversationsDAL.list(userId, page, pageSize);
  const total = await conversationsDAL.count(userId);

  return NextResponse.json(
    formatEntity(
      buildPaginatedResponse(conversations, page, pageSize, total),
      "list"
    )
  );
});

export const dynamic = "force-dynamic";
```

```typescript
// src/app/api/v1/conversations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { parseBody, getQueryParam } from "@/lib/api/utils";
import { errors } from "@/lib/api/middleware/errors";
import type { Id } from "@/convex/_generated/dataModel";

// Validation schema
const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  modelId: z.string().min(1).optional(),
  archived: z.boolean().optional(),
});

/**
 * GET /api/v1/conversations/:id
 * Get single conversation
 */
export const GET = withAuth(async (req, { userId, params }) => {
  const { id } = params;

  const conversation = await conversationsDAL.getById(
    id as Id<"conversations">,
    userId
  );

  if (!conversation) {
    throw errors.notFound("Conversation", id);
  }

  return NextResponse.json(
    formatEntity(conversation, "conversation", conversation._id)
  );
});

/**
 * PATCH /api/v1/conversations/:id
 * Update conversation (partial)
 */
export const PATCH = withAuth(async (req, { userId, params }) => {
  const { id } = params;
  const body = await parseBody(req);

  // Validate
  const result = updateConversationSchema.safeParse(body);
  if (!result.success) {
    throw errors.validation("Invalid request", result.error.flatten());
  }

  // Update
  const conversation = await conversationsDAL.update(
    id as Id<"conversations">,
    userId,
    result.data
  );

  return NextResponse.json(
    formatEntity(conversation, "conversation", conversation._id)
  );
});

/**
 * DELETE /api/v1/conversations/:id
 * Delete conversation (soft delete by default)
 */
export const DELETE = withAuth(async (req, { userId, params }) => {
  const { id } = params;
  const permanent = getQueryParam(req, "permanent") === "true";

  await conversationsDAL.delete(id as Id<"conversations">, userId, permanent);

  // 204 No Content
  return new NextResponse(null, { status: 204 });
});

export const dynamic = "force-dynamic";
```

### Step 5: Create Message Routes

**Goal**: REST API for sending/managing messages

**Action**: Implement POST/PATCH/DELETE for messages

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/conversations/[id]/messages/route.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/messages/[id]/route.ts`

**Code**:
```typescript
// src/app/api/v1/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";
import { messagesDAL } from "@/lib/api/dal/messages";
import { parseBody } from "@/lib/api/utils";
import { errors } from "@/lib/api/middleware/errors";
import type { Id } from "@/convex/_generated/dataModel";

// Validation schema
const sendMessageSchema = z.object({
  content: z.string().min(1),
  attachments: z
    .array(
      z.object({
        type: z.string(),
        url: z.string().url(),
        name: z.string(),
        size: z.number(),
      })
    )
    .optional(),
  modelId: z.string().min(1),
  parentId: z.string().optional() as z.ZodType<Id<"messages"> | undefined>,
});

/**
 * POST /api/v1/conversations/:id/messages
 * Send new message in conversation
 */
export const POST = withAuth(async (req, { userId, params }) => {
  const { id: conversationId } = params;
  const body = await parseBody(req);

  // Validate
  const result = sendMessageSchema.safeParse(body);
  if (!result.success) {
    throw errors.validation("Invalid request", result.error.flatten());
  }

  // Send message (triggers generation async)
  const message = await messagesDAL.send(userId, {
    conversationId: conversationId as Id<"conversations">,
    ...result.data,
  });

  // Return 202 Accepted (generation happens in background)
  return NextResponse.json(
    formatEntity(message, "message", message._id),
    { status: 202 }
  );
});

/**
 * GET /api/v1/conversations/:id/messages
 * List messages in conversation
 */
export const GET = withAuth(async (req, { userId, params }) => {
  const { id: conversationId } = params;

  const messages = await messagesDAL.list(
    conversationId as Id<"conversations">,
    userId
  );

  return NextResponse.json(formatEntity(messages, "list"));
});

export const dynamic = "force-dynamic";
```

```typescript
// src/app/api/v1/messages/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";
import { messagesDAL } from "@/lib/api/dal/messages";
import { parseBody, getQueryParam } from "@/lib/api/utils";
import { errors } from "@/lib/api/middleware/errors";
import type { Id } from "@/convex/_generated/dataModel";

// Validation schema
const updateMessageSchema = z.object({
  content: z.string().min(1).optional(),
  status: z.enum(["pending", "generating", "complete", "error"]).optional(),
  error: z.string().optional(),
});

/**
 * GET /api/v1/messages/:id
 * Get single message
 */
export const GET = withAuth(async (req, { userId, params }) => {
  const { id } = params;

  const message = await messagesDAL.getById(id as Id<"messages">, userId);

  if (!message) {
    throw errors.notFound("Message", id);
  }

  return NextResponse.json(formatEntity(message, "message", message._id));
});

/**
 * PATCH /api/v1/messages/:id
 * Update message (edit content or status)
 */
export const PATCH = withAuth(async (req, { userId, params }) => {
  const { id } = params;
  const body = await parseBody(req);

  // Validate
  const result = updateMessageSchema.safeParse(body);
  if (!result.success) {
    throw errors.validation("Invalid request", result.error.flatten());
  }

  // Update
  const message = await messagesDAL.update(
    id as Id<"messages">,
    userId,
    result.data
  );

  return NextResponse.json(formatEntity(message, "message", message._id));
});

/**
 * DELETE /api/v1/messages/:id
 * Delete message
 */
export const DELETE = withAuth(async (req, { userId, params }) => {
  const { id } = params;
  const permanent = getQueryParam(req, "permanent") === "true";

  await messagesDAL.delete(id as Id<"messages">, userId, permanent);

  return new NextResponse(null, { status: 204 });
});

export const dynamic = "force-dynamic";
```

### Step 6: Create Preferences Route

**Goal**: User settings API

**Action**: Implement preferences endpoint

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/preferences/route.ts`

**Code**:
```typescript
// src/app/api/v1/preferences/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";
import { preferencesDAL } from "@/lib/api/dal/preferences";
import { parseBody } from "@/lib/api/utils";
import { errors } from "@/lib/api/middleware/errors";

// Validation schema
const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  defaultModelId: z.string().optional(),
  language: z.string().optional(),
  sendOnEnter: z.boolean().optional(),
  showTimestamps: z.boolean().optional(),
  codeTheme: z.string().optional(),
});

/**
 * GET /api/v1/preferences
 * Get user preferences
 */
export const GET = withAuth(async (req, { userId }) => {
  const preferences = await preferencesDAL.get(userId);

  return NextResponse.json(formatEntity(preferences, "preferences"));
});

/**
 * PATCH /api/v1/preferences
 * Update preferences (partial)
 */
export const PATCH = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);

  // Validate
  const result = updatePreferencesSchema.safeParse(body);
  if (!result.success) {
    throw errors.validation("Invalid request", result.error.flatten());
  }

  // Update
  const preferences = await preferencesDAL.update(userId, result.data);

  return NextResponse.json(formatEntity(preferences, "preferences"));
});

/**
 * DELETE /api/v1/preferences
 * Reset to defaults
 */
export const DELETE = withAuth(async (req, { userId }) => {
  const preferences = await preferencesDAL.reset(userId);

  return NextResponse.json(formatEntity(preferences, "preferences"));
});

export const dynamic = "force-dynamic";
```

### Step 7: Update DAL Index

**Goal**: Export all DAL modules

**Action**: Update index file

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/dal/index.ts`

**Code**:
```typescript
// src/lib/api/dal/index.ts
/**
 * Data Access Layer (DAL)
 *
 * Centralized access to Convex queries/mutations.
 */

export * from "./users";
export * from "./conversations";
export * from "./messages";
export * from "./preferences";
// Export other DAL modules as created in future phases
```

## Code Examples & Patterns

### Pattern 1: Idempotent Operations

```typescript
// PATCH and DELETE should be idempotent (safe to retry)
export const PATCH = withAuth(async (req, { userId, params }) => {
  // Check if resource exists
  const existing = await dal.getById(params.id, userId);

  if (!existing) {
    // Return 404, not 500 (idempotent - same result on retry)
    throw errors.notFound("Resource", params.id);
  }

  // Apply update
  const updated = await dal.update(params.id, userId, body);

  // Same result every time for same input
  return NextResponse.json(formatEntity(updated, "resource"));
});
```

### Pattern 2: Optimistic Locking (future enhancement)

```typescript
// Use version/updatedAt for optimistic concurrency control
const updateSchema = z.object({
  title: z.string(),
  version: z.number(), // Client sends current version
});

export const PATCH = withAuth(async (req, { userId, params }) => {
  const body = await parseBody(req);
  const result = updateSchema.safeParse(body);

  const current = await dal.getById(params.id, userId);

  // Check version matches
  if (current.version !== result.data.version) {
    throw errors.validation("Resource was modified by another client", {
      currentVersion: current.version,
      requestVersion: result.data.version,
    });
  }

  // Update with version increment
  const updated = await dal.update(params.id, userId, {
    ...result.data,
    version: current.version + 1,
  });

  return NextResponse.json(formatEntity(updated, "resource"));
});
```

### Pattern 3: Batch Operations

```typescript
// POST /api/v1/conversations/batch-delete
const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(50), // Cap at 50
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);
  const result = batchDeleteSchema.safeParse(body);

  if (!result.success) {
    throw errors.validation("Invalid request", result.error.flatten());
  }

  // Delete in parallel
  const results = await Promise.allSettled(
    result.data.ids.map((id) =>
      conversationsDAL.delete(id as Id<"conversations">, userId)
    )
  );

  // Return summary
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - deleted;

  return NextResponse.json(
    formatEntity(
      {
        total: results.length,
        deleted,
        failed,
      },
      "batch-result"
    )
  );
});
```

## Testing & Validation

### Manual Testing Checklist

**1. Create Conversation**
```bash
# Terminal 1: Start dev server
bun dev

# Terminal 2: Test endpoint
curl -X POST http://localhost:3000/api/v1/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(pbpaste)" \
  -d '{
    "title": "Test Conversation",
    "modelId": "openai:gpt-4o"
  }'

# Expected: 201 Created with conversation object
```

**2. Send Message**
```bash
# Replace CONV_ID with ID from step 1
curl -X POST http://localhost:3000/api/v1/conversations/CONV_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(pbpaste)" \
  -d '{
    "content": "Hello, world!",
    "modelId": "openai:gpt-4o"
  }'

# Expected: 202 Accepted with message object (status: "pending")
```

**3. Update Conversation Title**
```bash
curl -X PATCH http://localhost:3000/api/v1/conversations/CONV_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(pbpaste)" \
  -d '{
    "title": "Renamed Conversation"
  }'

# Expected: 200 OK with updated conversation
```

**4. Delete Message**
```bash
curl -X DELETE http://localhost:3000/api/v1/messages/MSG_ID \
  -H "Authorization: Bearer $(pbpaste)"

# Expected: 204 No Content
```

**5. Update Preferences**
```bash
curl -X PATCH http://localhost:3000/api/v1/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(pbpaste)" \
  -d '{
    "theme": "dark",
    "sendOnEnter": true
  }'

# Expected: 200 OK with updated preferences
```

### Integration Testing

```typescript
// tests/api/conversations.test.ts (create in Phase 8)
import { POST, GET } from "@/app/api/v1/conversations/route";
import { mockAuth } from "@/tests/helpers";

describe("POST /api/v1/conversations", () => {
  it("creates conversation and returns 201", async () => {
    mockAuth({ userId: "user_123" });

    const req = new Request("http://localhost:3000/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        modelId: "openai:gpt-4o",
      }),
    });

    const res = await POST(req, {});

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe("success");
    expect(data.data.title).toBe("Test");
  });

  it("rejects invalid modelId", async () => {
    mockAuth({ userId: "user_123" });

    const req = new Request("http://localhost:3000/api/v1/conversations", {
      method: "POST",
      body: JSON.stringify({ modelId: "" }), // Invalid
    });

    const res = await POST(req, {});

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.status).toBe("error");
  });
});
```

## Success Criteria

- [ ] Conversations API complete (POST, PATCH, DELETE)
- [ ] Messages API complete (POST, PATCH, DELETE)
- [ ] Preferences API complete (PATCH)
- [ ] All routes return envelope format
- [ ] Auth verified on all endpoints
- [ ] Zod validation on all inputs
- [ ] DAL layer complete for 3 domains
- [ ] Manual testing passed (can create/update/delete via cURL)
- [ ] Logs show request/response for all operations

## Common Pitfalls

### Pitfall 1: Forgetting 202 for Async Operations
**Problem**: Message generation is async, but returning 200 implies complete
**Solution**: Return 202 Accepted for POST /messages, client polls for completion

### Pitfall 2: Not Verifying Ownership
**Problem**: User could manipulate other users' conversations by guessing IDs
**Solution**: Always check `conversation.userId === userId` in DAL

### Pitfall 3: Exposing Internal Errors
**Problem**: Raw Convex errors leak implementation details
**Solution**: Catch in middleware, return generic "Internal error" with code

### Pitfall 4: Missing Idempotency
**Problem**: Network retry creates duplicate conversations
**Solution**: Return existing resource on duplicate POST (check by title hash)

### Pitfall 5: Unbounded Batch Operations
**Problem**: Batch delete of 1000 conversations times out
**Solution**: Cap batch operations at 50 items, return partial results

### Pitfall 6: Forgetting to Update DAL Index
**Problem**: New DAL modules not exported, import fails
**Solution**: Always update `src/lib/api/dal/index.ts` when creating new DAL file

## Next Steps

After completing Phase 1:

**Immediate next**: [Phase 2: React Query Integration](./phase-2-react-query.md)
- Install `@tanstack/react-query`
- Create `QueryProvider` wrapper
- Migrate `ChatInput.tsx` to use `useMutation` hook
- Replace Convex `useMutation` with React Query `useMutation`

**Then**: [Phase 3: Queries](./phase-3-queries.md)
- Implement GET endpoints for conversations, messages
- Create React Query hooks (`useConversations`, `useMessages`)
- Hybrid approach: Keep Convex for web, add polling for mobile

**Testing checklist before Phase 2**:
1. All mutation endpoints return 2xx ✅
2. Can create conversation via API ✅
3. Can send message via API ✅
4. Can update preferences via API ✅
5. Ownership checks work (403 for wrong user) ✅
6. Validation errors return 400 ✅

**Migration priority** (update components in this order during Phase 2):
1. `ChatInput.tsx` - Send messages
2. `app-sidebar.tsx` - Create/delete conversations
3. `ConversationHeaderMenu.tsx` - Rename conversations
4. `UISettings.tsx` - Update preferences
5. `ChatMessage.tsx` - Edit/delete messages

Ready for Phase 2: React Query Integration (replace Convex hooks with API calls).
