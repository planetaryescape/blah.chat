# Phase 4: Actions - Long-Running Operations API

## Overview

Wrap Convex actions (search, memory extraction, transcription) in REST API endpoints. Enable mobile apps to trigger long-running operations without timeout issues.

## Context & Grand Scope

### Why This Phase Exists
Convex actions run server-side for up to 10 minutes, survive page refresh. Mobile apps need equivalent: trigger operation via HTTP, poll for completion. Pattern: POST /actions/search → returns job ID → GET /actions/jobs/:id for status.

### Dependencies
- **Previous phases**: Phase 0 (foundation), Phase 1 (mutations), Phase 2 (React Query), Phase 3 (queries) ✅
- **Blocks**: Phase 6 (resilient generation validation)
- **Critical path**: Search and memories needed for MVP

## Research & Decision Rationale

### Industry Patterns Analyzed

**1. Long-Running Operations**

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Synchronous** | Client waits for response (30-60s timeout) | Quick operations (<30s) |
| **Async Job** | Return job ID, client polls for status | Long operations (>30s) |
| **Webhooks** | Server calls client URL when done | Server-to-server |
| **WebSockets** | Bi-directional streaming | Real-time progress |

**ChatGPT approach**:
- Message generation: SSE streaming (real-time)
- Search: Synchronous (<5s typically)
- File processing: Async job (minutes)

**2. Job Status Polling**

Industry standards:
- Stripe: POST /charges → 202 Accepted → Poll GET /charges/:id
- AWS Lambda: Invoke async → Poll CloudWatch logs
- GitHub Actions: Trigger workflow → Poll status endpoint

**Polling patterns**:
- Initial interval: 1s (fast operations)
- Exponential backoff: 1s → 2s → 4s → 8s (max 30s)
- Stop conditions: status=complete|error|timeout

**3. Timeout Strategies**

| Platform | Timeout | Strategy |
|----------|---------|----------|
| Vercel Edge | 30s | Use Node.js runtime for long ops |
| Vercel Node.js | 60s (Hobby), 300s (Pro) | Async job pattern |
| Convex Actions | 600s (10min) | Already async, just wrap |

**4. Progress Reporting**

Options:
- **Simple**: status: pending|running|complete|error
- **Percentage**: { status, progress: 0-100 }
- **Detailed**: { status, steps: [{ name, status }] }

**Decision: Simple** (Phase 4), add percentage in Phase 5 if needed

### Decisions Made

**Decision 1: Actions to Migrate**
- Priority: search (hybrid), memory extraction, transcription
- Low priority: analytics aggregation (web-only)
- Skip: generation (stays server-side, migrated in Phase 6)

**Decision 2: Async Job Pattern**
- POST /actions/search → { jobId: "job_123", status: "pending" }
- GET /actions/jobs/job_123 → { status: "complete", result: {...} }
- Rationale: Works on all hosting platforms, client-agnostic

**Decision 3: In-Memory Job Store (Phase 4)**
- Store jobs in Convex (tables: `jobs`, `jobResults`)
- Phase 4: Persist jobs, manual polling
- Phase 5: Add SSE for push notifications
- Rationale: Simple, no Redis/Queue needed

**Decision 4: Job Expiration**
- Results expire after 1 hour (configurable)
- Cron job cleans up old jobs
- Rationale: Prevent infinite storage growth

## Current State Analysis

### How blah.chat Works Today

**1. Hybrid Search (Convex Action)**
```typescript
// convex/search/hybrid.ts:120-180
export const hybrid = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Full-text search (fast)
    const textResults = await ctx.runQuery(internal.search.fullText, {
      query: args.query,
    });

    // 2. Vector search (slow - embedding generation)
    const vectorResults = await ctx.runAction(internal.search.vector, {
      query: args.query,
    });

    // 3. Merge with RRF
    const merged = mergeResults(textResults, vectorResults);

    return merged;
  },
});
```

**Usage**:
```typescript
// src/components/search/SearchResults.tsx
const results = useQuery(api.search.hybrid, { query: searchTerm });

// Real-time subscription - results update as they compute
```

**2. Memory Extraction (Convex Action)**
```typescript
// convex/memories.ts:45-90
export const extractFromConversation = action({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    // 1. Get messages
    const messages = await ctx.runQuery(internal.messages.list, {
      conversationId: args.conversationId,
    });

    // 2. LLM extraction (slow - multiple API calls)
    const facts = await extractFacts(messages); // Uses gpt-4o-mini

    // 3. Generate embeddings (slow - batch API)
    const embeddings = await generateEmbeddings(facts);

    // 4. Store in vector DB
    for (const fact of facts) {
      await ctx.runMutation(internal.memories.create, {
        conversationId: args.conversationId,
        content: fact.content,
        embedding: fact.embedding,
      });
    }

    return facts;
  },
});
```

**3. Transcription (Convex Action)**
```typescript
// convex/transcription.ts:30-70
export const transcribe = action({
  args: {
    audioUrl: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    // 1. Download audio (slow - network)
    const audio = await fetch(args.audioUrl);

    // 2. Transcribe with Whisper (slow - minutes)
    const transcript = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
    });

    // 3. Store transcript
    await ctx.runMutation(internal.transcription.record, {
      conversationId: args.conversationId,
      transcript: transcript.text,
    });

    return transcript;
  },
});
```

### Specific Files/Patterns

**Actions to migrate** (from `/Users/bhekanik/code/planetaryescape/blah.chat/`):
1. `convex/search/hybrid.ts:120` - Hybrid search (text + vector)
2. `convex/memories.ts:45` - Memory extraction from conversation
3. `convex/transcription.ts:30` - Audio transcription
4. `convex/ai/generateTitle.ts:20` - Auto-generate conversation title

**Total actions**: 4 to migrate

## Target State

### What We're Building

```
src/
├── lib/
│   ├── api/
│   │   └── dal/
│   │       └── jobs.ts              # Job management DAL
│   └── hooks/
│       └── mutations/
│           ├── useSearch.ts          # POST /actions/search
│           ├── useExtractMemories.ts # POST /actions/memories/extract
│           └── useTranscribe.ts      # POST /actions/transcribe
├── app/api/v1/
│   ├── actions/
│   │   ├── search/
│   │   │   └── route.ts             # POST /actions/search
│   │   ├── memories/
│   │   │   └── extract/
│   │   │       └── route.ts         # POST /actions/memories/extract
│   │   ├── transcribe/
│   │   │   └── route.ts             # POST /actions/transcribe
│   │   └── jobs/
│   │       └── [id]/
│   │           └── route.ts         # GET /actions/jobs/:id
├── convex/
│   ├── schema.ts                     # Add jobs, jobResults tables
│   ├── jobs.ts                       # Job CRUD operations
│   └── cron.ts                       # Job cleanup cron
```

### Success Looks Like

**1. Trigger Search**
```bash
POST /api/v1/actions/search
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "React hooks tutorial",
  "limit": 10
}
```

Response (202 Accepted):
```json
{
  "status": "success",
  "sys": {
    "entity": "job",
    "id": "job_k123..."
  },
  "data": {
    "jobId": "job_k123...",
    "status": "pending",
    "createdAt": 1702209600000
  }
}
```

**2. Poll Job Status**
```bash
GET /api/v1/actions/jobs/job_k123...
Authorization: Bearer <token>
```

Response (200 OK):
```json
{
  "status": "success",
  "sys": { "entity": "job" },
  "data": {
    "jobId": "job_k123...",
    "status": "complete",
    "result": {
      "results": [
        {
          "conversationId": "conv_456",
          "messageId": "msg_789",
          "content": "...",
          "score": 0.95
        }
      ]
    },
    "completedAt": 1702209605000
  }
}
```

**3. Job States**
- `pending`: Job created, not started
- `running`: Action executing
- `complete`: Success, result available
- `error`: Failed, error message available
- `expired`: Result deleted after TTL

## Implementation Steps

### Step 1: Add Jobs Schema

**Goal**: Persist job state in Convex

**Action**: Add jobs table to schema

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/convex/schema.ts`

**Code**:
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ... existing tables ...

  // Jobs table
  jobs: defineTable({
    userId: v.string(), // Clerk user ID
    type: v.string(), // "search" | "memory-extraction" | "transcription"
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("error"),
      v.literal("expired")
    ),
    input: v.any(), // Original request payload
    result: v.optional(v.any()), // Result data (on success)
    error: v.optional(v.string()), // Error message (on failure)
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    expiresAt: v.number(), // Auto-delete after 1 hour
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_expires", ["expiresAt"]),
});
```

### Step 2: Create Jobs DAL

**Goal**: Centralize job CRUD operations

**Action**: Create DAL for job management

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/dal/jobs.ts`

**Code**:
```typescript
// src/lib/api/dal/jobs.ts
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type JobStatus = "pending" | "running" | "complete" | "error" | "expired";

export interface Job {
  _id: Id<"jobs">;
  userId: string;
  type: string;
  status: JobStatus;
  input: any;
  result?: any;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  expiresAt: number;
}

export const jobsDAL = {
  /**
   * Create new job
   */
  async create(userId: string, type: string, input: any): Promise<Job> {
    const jobId = ((await (fetchMutation as any)(api.jobs.create, {
      userId,
      type,
      input,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour TTL
    })) as Id<"jobs">);

    return this.getById(jobId, userId);
  },

  /**
   * Get job by ID (verify ownership)
   */
  async getById(id: Id<"jobs">, userId: string): Promise<Job | null> {
    const job = await fetchQuery(api.jobs.getById, { id });

    if (!job) {
      return null;
    }

    // Verify ownership
    if (job.userId !== userId) {
      throw new Error("Access denied");
    }

    return job as Job;
  },

  /**
   * Update job status
   */
  async updateStatus(
    id: Id<"jobs">,
    status: JobStatus,
    updates: Partial<Pick<Job, "result" | "error" | "startedAt" | "completedAt">> = {}
  ): Promise<void> {
    await fetchMutation(api.jobs.updateStatus, {
      id,
      status,
      ...updates,
    });
  },

  /**
   * List user jobs (recent)
   */
  async listRecent(userId: string, limit = 20): Promise<Job[]> {
    return fetchQuery(api.jobs.listRecent, { userId, limit }) as Promise<Job[]>;
  },
};
```

### Step 3: Create Jobs Convex Module

**Goal**: Job CRUD operations in Convex

**Action**: Create query/mutation handlers for jobs

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/convex/jobs.ts`

**Code**:
```typescript
// convex/jobs.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Create new job
 */
export const create = mutation({
  args: {
    userId: v.string(),
    type: v.string(),
    input: v.any(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobs", {
      userId: args.userId,
      type: args.type,
      status: "pending",
      input: args.input,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
  },
});

/**
 * Get job by ID
 */
export const getById = query({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Update job status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("jobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("error"),
      v.literal("expired")
    ),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, updates);
  },
});

/**
 * List recent jobs for user
 */
export const listRecent = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 20);
  },
});

/**
 * Delete expired jobs (called by cron)
 */
export const deleteExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredJobs = await ctx.db
      .query("jobs")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    for (const job of expiredJobs) {
      await ctx.db.delete(job._id);
    }

    return { deleted: expiredJobs.length };
  },
});
```

### Step 4: Create Search Action Wrapper

**Goal**: Async search endpoint

**Action**: POST /actions/search triggers Convex action, returns job ID

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/actions/search/route.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/convex/actions/search.ts`

**Code**:
```typescript
// src/app/api/v1/actions/search/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";
import { jobsDAL } from "@/lib/api/dal/jobs";
import { parseBody } from "@/lib/api/utils";
import { errors } from "@/lib/api/middleware/errors";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Validation schema
const searchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).optional(),
});

/**
 * POST /api/v1/actions/search
 * Trigger hybrid search (async)
 */
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);

  // Validate
  const result = searchSchema.safeParse(body);
  if (!result.success) {
    throw errors.validation("Invalid request", result.error.flatten());
  }

  // Create job
  const job = await jobsDAL.create(userId, "search", result.data);

  // Trigger action (fire-and-forget)
  fetchAction(api.actions.search.execute, {
    jobId: job._id,
    query: result.data.query,
    limit: result.data.limit || 10,
  }).catch((error) => {
    // Action failed to start - update job
    jobsDAL.updateStatus(job._id as Id<"jobs">, "error", {
      error: error.message,
      completedAt: Date.now(),
    });
  });

  // Return job ID immediately (202 Accepted)
  return NextResponse.json(
    formatEntity(
      {
        jobId: job._id,
        status: job.status,
        createdAt: job.createdAt,
      },
      "job"
    ),
    { status: 202 }
  );
});

export const dynamic = "force-dynamic";
```

```typescript
// convex/actions/search.ts
import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal, api } from "../_generated/api";

/**
 * Execute search action (triggered by API)
 */
export const execute = action({
  args: {
    jobId: v.id("jobs"),
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Mark as running
      await ctx.runMutation(internal.jobs.updateStatus, {
        id: args.jobId,
        status: "running",
        startedAt: Date.now(),
      });

      // Execute hybrid search (existing action)
      const results = ((await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.search.hybrid,
        {
          query: args.query,
          limit: args.limit,
        }
      )) as any[]);

      // Mark as complete
      await ctx.runMutation(internal.jobs.updateStatus, {
        id: args.jobId,
        status: "complete",
        result: { results },
        completedAt: Date.now(),
      });

      return results;
    } catch (error) {
      // Mark as error
      await ctx.runMutation(internal.jobs.updateStatus, {
        id: args.jobId,
        status: "error",
        error: error instanceof Error ? error.message : "Search failed",
        completedAt: Date.now(),
      });

      throw error;
    }
  },
});
```

### Step 5: Create Job Status Endpoint

**Goal**: Poll job status/result

**Action**: GET /actions/jobs/:id returns current status

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/actions/jobs/[id]/route.ts`

**Code**:
```typescript
// src/app/api/v1/actions/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";
import { jobsDAL } from "@/lib/api/dal/jobs";
import { errors } from "@/lib/api/middleware/errors";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * GET /api/v1/actions/jobs/:id
 * Get job status and result
 */
export const GET = withAuth(async (req, { userId, params }) => {
  const { id } = params;

  const job = await jobsDAL.getById(id as Id<"jobs">, userId);

  if (!job) {
    throw errors.notFound("Job", id);
  }

  // Return job with status
  return NextResponse.json(
    formatEntity(
      {
        jobId: job._id,
        status: job.status,
        type: job.type,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        result: job.status === "complete" ? job.result : undefined,
        error: job.status === "error" ? job.error : undefined,
      },
      "job"
    )
  );
});

export const dynamic = "force-dynamic";
```

### Step 6: Create Search Hook with Polling

**Goal**: React Query hook that polls job status

**Action**: Create `useSearch` hook

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/mutations/useSearch.ts`

**Code**:
```typescript
// src/lib/hooks/mutations/useSearch.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useState } from "react";

interface SearchInput {
  query: string;
  limit?: number;
}

interface SearchJob {
  jobId: string;
  status: "pending" | "running" | "complete" | "error";
  result?: {
    results: Array<{
      conversationId: string;
      messageId: string;
      content: string;
      score: number;
    }>;
  };
  error?: string;
}

/**
 * Trigger search and poll for result
 */
export function useSearch() {
  const queryClient = useQueryClient();
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Mutation: Trigger search
  const triggerMutation = useMutation({
    mutationFn: async (input: SearchInput) => {
      return apiClient.post<SearchJob>("/actions/search", input);
    },
    onSuccess: (data) => {
      // Store job ID for polling
      setCurrentJobId(data.jobId);
    },
  });

  // Query: Poll job status
  const jobQuery = useQuery({
    queryKey: ["job", currentJobId],
    queryFn: async () => {
      if (!currentJobId) return null;
      return apiClient.get<SearchJob>(`/actions/jobs/${currentJobId}`);
    },
    enabled: currentJobId !== null,
    refetchInterval: (data) => {
      // Stop polling when complete/error
      if (data?.status === "complete" || data?.status === "error") {
        return false;
      }
      // Exponential backoff: 1s → 2s → 4s → 8s (max 10s)
      return Math.min(1000 * 2 ** (data?.refetchCount || 0), 10000);
    },
    refetchOnWindowFocus: false,
  });

  return {
    // Trigger search
    search: triggerMutation.mutateAsync,
    isSearching: triggerMutation.isPending,

    // Job status
    job: jobQuery.data,
    isPolling: jobQuery.isFetching,

    // Results
    results: jobQuery.data?.status === "complete" ? jobQuery.data.result?.results : undefined,
    error: jobQuery.data?.status === "error" ? jobQuery.data.error : triggerMutation.error,

    // Reset
    reset: () => {
      setCurrentJobId(null);
      queryClient.removeQueries({ queryKey: ["job", currentJobId] });
    },
  };
}
```

### Step 7: Create Memory Extraction & Transcription Endpoints

**Goal**: Similar pattern for other actions

**Action**: Create POST /actions/memories/extract and POST /actions/transcribe

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/actions/memories/extract/route.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/actions/transcribe/route.ts`

**Code**:
```typescript
// src/app/api/v1/actions/memories/extract/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";
import { jobsDAL } from "@/lib/api/dal/jobs";
import { parseBody } from "@/lib/api/utils";
import { errors } from "@/lib/api/middleware/errors";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const extractMemoriesSchema = z.object({
  conversationId: z.string() as z.ZodType<Id<"conversations">>,
});

/**
 * POST /api/v1/actions/memories/extract
 * Extract memories from conversation (async)
 */
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);

  const result = extractMemoriesSchema.safeParse(body);
  if (!result.success) {
    throw errors.validation("Invalid request", result.error.flatten());
  }

  // Create job
  const job = await jobsDAL.create(userId, "memory-extraction", result.data);

  // Trigger action
  fetchAction(api.actions.memories.extract, {
    jobId: job._id,
    conversationId: result.data.conversationId,
  }).catch((error) => {
    jobsDAL.updateStatus(job._id as Id<"jobs">, "error", {
      error: error.message,
      completedAt: Date.now(),
    });
  });

  return NextResponse.json(
    formatEntity(
      {
        jobId: job._id,
        status: job.status,
        createdAt: job.createdAt,
      },
      "job"
    ),
    { status: 202 }
  );
});

export const dynamic = "force-dynamic";
```

```typescript
// src/app/api/v1/actions/transcribe/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";
import { jobsDAL } from "@/lib/api/dal/jobs";
import { parseBody } from "@/lib/api/utils";
import { errors } from "@/lib/api/middleware/errors";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const transcribeSchema = z.object({
  audioUrl: z.string().url(),
  conversationId: z.string() as z.ZodType<Id<"conversations">>,
});

/**
 * POST /api/v1/actions/transcribe
 * Transcribe audio file (async)
 */
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);

  const result = transcribeSchema.safeParse(body);
  if (!result.success) {
    throw errors.validation("Invalid request", result.error.flatten());
  }

  // Create job
  const job = await jobsDAL.create(userId, "transcription", result.data);

  // Trigger action
  fetchAction(api.actions.transcription.transcribe, {
    jobId: job._id,
    audioUrl: result.data.audioUrl,
    conversationId: result.data.conversationId,
  }).catch((error) => {
    jobsDAL.updateStatus(job._id as Id<"jobs">, "error", {
      error: error.message,
      completedAt: Date.now(),
    });
  });

  return NextResponse.json(
    formatEntity(
      {
        jobId: job._id,
        status: job.status,
        createdAt: job.createdAt,
      },
      "job"
    ),
    { status: 202 }
  );
});

export const dynamic = "force-dynamic";
```

### Step 8: Create Cron Job for Cleanup

**Goal**: Auto-delete expired jobs

**Action**: Add cron job to Convex

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/convex/cron.ts`

**Code**:
```typescript
// convex/cron.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired jobs every hour
crons.hourly(
  "delete-expired-jobs",
  { hourUTC: 0 }, // Run at midnight UTC
  internal.jobs.deleteExpired
);

export default crons;
```

## Code Examples & Patterns

### Pattern 1: Custom Polling Hook

```typescript
// Hook that handles polling lifecycle
export function useJob(jobId: string | null) {
  const { data, refetch } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => apiClient.get(`/actions/jobs/${jobId}`),
    enabled: jobId !== null,
    refetchInterval: (data) => {
      const status = data?.status;
      if (status === "complete" || status === "error") {
        return false; // Stop polling
      }
      return 2000; // Poll every 2s
    },
  });

  return {
    status: data?.status,
    result: data?.result,
    error: data?.error,
    isPolling: data?.status === "running" || data?.status === "pending",
    refetch,
  };
}
```

### Pattern 2: Progress Reporting (Future)

```typescript
// Add progress field to jobs schema
jobs: defineTable({
  // ... existing fields ...
  progress: v.optional(v.object({
    current: v.number(),
    total: v.number(),
    message: v.string(),
  })),
});

// Update progress during action
await ctx.runMutation(internal.jobs.updateStatus, {
  id: jobId,
  status: "running",
  progress: {
    current: 50,
    total: 100,
    message: "Generating embeddings...",
  },
});
```

### Pattern 3: Job Cancellation

```typescript
// Add DELETE /actions/jobs/:id endpoint
export const DELETE = withAuth(async (req, { userId, params }) => {
  const job = await jobsDAL.getById(params.id, userId);

  if (!job) {
    throw errors.notFound("Job", params.id);
  }

  if (job.status === "complete") {
    throw errors.validation("Cannot cancel completed job");
  }

  // Mark as canceled (action checks this flag)
  await jobsDAL.updateStatus(params.id, "error", {
    error: "Canceled by user",
    completedAt: Date.now(),
  });

  return new NextResponse(null, { status: 204 });
});
```

## Testing & Validation

### Manual Testing

**1. Test Search Action**
```bash
# Trigger search
curl -X POST http://localhost:3000/api/v1/actions/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(pbpaste)" \
  -d '{"query": "React hooks", "limit": 10}'

# Expected: 202 Accepted with jobId
# {"status":"success","data":{"jobId":"job_k123...","status":"pending"}}

# Poll status
curl http://localhost:3000/api/v1/actions/jobs/job_k123... \
  -H "Authorization: Bearer $(pbpaste)"

# Initially: {"status":"running"}
# After 2-5s: {"status":"complete","result":{...}}
```

**2. Test Error Handling**
```bash
# Invalid query (empty string)
curl -X POST http://localhost:3000/api/v1/actions/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(pbpaste)" \
  -d '{"query": ""}'

# Expected: 400 Bad Request
```

**3. Test Job Expiration**
```bash
# Create job, wait 1+ hour, poll
# Expected: Job deleted, 404 Not Found
```

### Integration Testing

```typescript
// tests/api/actions/search.test.ts
import { POST } from "@/app/api/v1/actions/search/route";
import { GET } from "@/app/api/v1/actions/jobs/[id]/route";
import { mockAuth } from "@/tests/helpers";

describe("POST /api/v1/actions/search", () => {
  it("triggers search and returns job ID", async () => {
    mockAuth({ userId: "user_123" });

    const req = new Request("http://localhost:3000/api/v1/actions/search", {
      method: "POST",
      body: JSON.stringify({ query: "test", limit: 5 }),
    });

    const res = await POST(req, {});

    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.data.jobId).toBeDefined();
    expect(data.data.status).toBe("pending");
  });

  it("completes search and returns results", async () => {
    // Create job
    const jobRes = await POST(...);
    const { jobId } = (await jobRes.json()).data;

    // Poll until complete
    let status = "pending";
    while (status === "pending" || status === "running") {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const statusRes = await GET(
        new Request(`http://localhost:3000/api/v1/actions/jobs/${jobId}`),
        { params: { id: jobId } }
      );

      const data = await statusRes.json();
      status = data.data.status;

      if (status === "complete") {
        expect(data.data.result).toBeDefined();
        expect(data.data.result.results).toBeInstanceOf(Array);
        break;
      }
    }
  });
});
```

## Success Criteria

- [ ] Jobs schema added to Convex
- [ ] Jobs DAL created
- [ ] POST /actions/search works (returns job ID)
- [ ] GET /actions/jobs/:id works (returns status/result)
- [ ] useSearch hook polls until complete
- [ ] Memory extraction endpoint created
- [ ] Transcription endpoint created
- [ ] Cron job cleans up expired jobs
- [ ] Error handling works (failed actions update job)
- [ ] Manual testing passed (search completes in 2-5s)

## Common Pitfalls

### Pitfall 1: Forgetting Fire-and-Forget
**Problem**: Awaiting `fetchAction` blocks API route, times out
**Solution**: Call `fetchAction(...).catch()` without await

### Pitfall 2: Not Updating Job on Action Error
**Problem**: Action fails, job stays "running" forever
**Solution**: Always wrap action in try/catch, update job status

### Pitfall 3: Polling Too Fast
**Problem**: 100ms interval hammers server, wastes resources
**Solution**: Use exponential backoff (1s → 2s → 4s → 8s)

### Pitfall 4: Not Expiring Jobs
**Problem**: Jobs table grows infinitely
**Solution**: Set `expiresAt`, run cron job to clean up

### Pitfall 5: Exposing Job to Wrong User
**Problem**: User A can poll User B's job by guessing ID
**Solution**: Always check `job.userId === userId` in DAL

## Next Steps

After completing Phase 4:

**Immediate next**: [Phase 5: Real-Time Updates](./phase-5-real-time.md)
- SSE for message streaming (better than polling)
- Light polling for conversation list
- Optimistic updates + real-time sync

**Testing checklist before Phase 5**:
1. Search action completes successfully ✅
2. Job status polling works ✅
3. Results returned on completion ✅
4. Errors handled gracefully ✅
5. Expired jobs deleted by cron ✅
6. useSearch hook works in component ✅

Ready for Phase 5: Real-Time Updates (SSE for streaming, push notifications).
