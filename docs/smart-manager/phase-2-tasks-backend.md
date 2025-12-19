> **STATUS: IMPLEMENTED**
>
> This phase has been fully implemented and verified as of December 2025.
> See `convex/tasks.ts`, `convex/ai/taskExtraction.ts`, `convex/tasks/tags.ts` for actual implementation.

# Phase 2: Tasks Backend - CRUD, Extraction & Auto-Tagging

## Overview

Build the complete backend for task management: CRUD operations, AI-powered task extraction from transcripts, smart deadline parsing, and auto-tagging integration.

**Duration**: 2-3 days
**Dependencies**: Phase 1 (Schema) must be complete
**Output**: Tasks API ready for UI integration

## Context: What We're Building

**Smart Assistant** extracts actionable tasks from meeting recordings/transcripts using LLM-based analysis. This phase builds:

1. **Basic CRUD**: Create, read, update, delete, complete tasks
2. **Smart Extraction**: Transcript → structured tasks with confidence scores
3. **Deadline Parsing**: "next Friday" → ISO timestamps
4. **Auto-Tagging**: Apply existing tag system to tasks

## Existing Patterns to Follow

### 1. Transcription System (`convex/transcription.ts`)
**Pattern**: Resilient action-based processing
```typescript
export const transcribeAudio = action({
  handler: async (ctx, args) => {
    // Long-running operation
    // Persists results to DB
    // Survives page refresh
  },
});
```

### 2. Memory Extraction (`convex/memories/extract.ts`)
**Pattern**: LLM with zod schemas, quality thresholds
```typescript
const memorySchema = z.object({
  facts: z.array(z.object({
    content: z.string().min(10).max(500),
    importance: z.number().min(1).max(10),
    confidence: z.number().min(0).max(1),
  })),
});

// Filter: importance ≥ 7, confidence ≥ 0.7
```

### 3. Auto-Tagging (`convex/notes/tags.ts`)
**Pattern**: 3-tier semantic matching
1. Exact slug match (normalize case/whitespace)
2. Fuzzy string match (Levenshtein ≤2)
3. Semantic similarity (embedding cosine ≥0.85)

### 4. Projects CRUD (`convex/projects.ts`)
**Pattern**: Ownership checks, getCurrentUser
```typescript
export const create = mutation({
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    // Verify ownership before mutations
  },
});
```

## Implementation Part 1: Task CRUD Operations

### File: `convex/tasks.ts` (NEW)

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";
import type { Doc } from "./_generated/dataModel";

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a new task
 */
export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    deadline: v.optional(v.number()),
    deadlineSource: v.optional(v.string()),
    urgency: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    )),
    projectId: v.optional(v.id("projects")),
    sourceType: v.optional(v.union(
      v.literal("transcript"),
      v.literal("conversation"),
      v.literal("manual"),
      v.literal("file")
    )),
    sourceId: v.optional(v.string()),
    sourceContext: v.optional(v.object({
      snippet: v.string(),
      timestamp: v.optional(v.number()),
      confidence: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const taskId = await ctx.db.insert("tasks", {
      userId: user._id,
      title: args.title,
      description: args.description,
      status: "confirmed", // Default to confirmed for manual creation
      deadline: args.deadline,
      deadlineSource: args.deadlineSource,
      urgency: args.urgency,
      projectId: args.projectId,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      sourceContext: args.sourceContext,
      position: Date.now(), // For future drag-drop ordering
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create activity event
    await ctx.db.insert("activityEvents", {
      userId: user._id,
      projectId: args.projectId,
      eventType: "task_created",
      resourceType: "task",
      resourceId: taskId,
      createdAt: Date.now(),
    });

    return taskId;
  },
});

/**
 * Update task fields
 */
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("suggested"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    deadline: v.optional(v.number()),
    urgency: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    )),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found or access denied");
    }

    const updates: Partial<Doc<"tasks">> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.deadline !== undefined) updates.deadline = args.deadline;
    if (args.urgency !== undefined) updates.urgency = args.urgency;
    if (args.projectId !== undefined) updates.projectId = args.projectId;

    await ctx.db.patch(args.taskId, updates);
  },
});

/**
 * Mark task as complete
 */
export const completeTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found or access denied");
    }

    await ctx.db.patch(args.taskId, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Activity event
    await ctx.db.insert("activityEvents", {
      userId: user._id,
      projectId: task.projectId,
      eventType: "task_completed",
      resourceType: "task",
      resourceId: args.taskId,
      createdAt: Date.now(),
    });
  },
});

/**
 * Delete task
 */
export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const task = await ctx.db.get(args.taskId);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found or access denied");
    }

    // Delete task tags first (cleanup)
    const taskTags = await ctx.db
      .query("taskTags")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const tt of taskTags) {
      await ctx.db.delete(tt._id);
    }

    // Delete task
    await ctx.db.delete(args.taskId);
  },
});

// ============================================================
// QUERIES
// ============================================================

/**
 * List user's tasks with optional filters
 */
export const listTasks = query({
  args: {
    status: v.optional(v.union(
      v.literal("suggested"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let tasksQuery;

    if (args.status) {
      // Filter by status
      tasksQuery = ctx.db
        .query("tasks")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user._id).eq("status", args.status)
        );
    } else if (args.projectId) {
      // Filter by project
      tasksQuery = ctx.db
        .query("tasks")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", args.projectId)
        );
    } else {
      // All tasks
      tasksQuery = ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", user._id));
    }

    const tasks = await tasksQuery.collect();

    // Sort by position (for drag-drop ordering)
    return tasks.sort((a, b) => (a.position || 0) - (b.position || 0));
  },
});

/**
 * Get upcoming tasks (next 7 days)
 */
export const getUpcomingTasks = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "confirmed")
      )
      .collect();

    return tasks
      .filter((t) => t.deadline && t.deadline >= now && t.deadline <= weekFromNow)
      .sort((a, b) => (a.deadline || 0) - (b.deadline || 0));
  },
});

/**
 * Get today's tasks
 */
export const getTodaysTasks = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "confirmed")
      )
      .collect();

    return tasks
      .filter((t) => t.deadline && t.deadline >= startOfDay && t.deadline <= endOfDay)
      .sort((a, b) => (a.deadline || 0) - (b.deadline || 0));
  },
});

/**
 * Get single task by ID
 */
export const getTaskById = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const task = await ctx.db.get(args.taskId);

    if (!task || task.userId !== user._id) {
      return null;
    }

    return task;
  },
});
```

## Implementation Part 2: Task Extraction from Transcripts

### File: `src/lib/prompts/taskExtraction.ts` (NEW)

```typescript
/**
 * Prompt for extracting tasks from transcripts
 */
export const TASK_EXTRACTION_PROMPT = `You are an expert at analyzing meeting transcripts and extracting actionable tasks.

For each task you identify:
1. Extract the ACTION (what needs to be done)
2. Identify the DEADLINE if mentioned ("next week", "by Friday", "ASAP", etc.)
3. Determine URGENCY based on language:
   - "ASAP", "immediately", "urgent" → urgent
   - "today", "tonight" → urgent
   - "tomorrow", "this week" → high
   - "next week", "soon" → medium
   - "eventually", "someday" → low
4. Rate your CONFIDENCE (0.5-1.0):
   - 1.0 = Explicit task ("John, please update the landing page")
   - 0.8 = Clear implication ("We need to update the landing page")
   - 0.6 = Vague mention ("Should probably update landing page")
   - 0.5 = Very uncertain
5. Capture CONTEXT (1-2 sentences around the task mention)

IMPORTANT:
- Only extract ACTIONABLE items (ignore informational statements)
- Preserve original deadline language for transparency
- If timestamp available, note when task was mentioned
- Min confidence 0.5 (skip anything lower)

Return a list of tasks with:
- title: Brief action statement (5-10 words)
- description: More detail if available
- deadlineText: Original phrase ("next Friday", "ASAP", null)
- urgency: low | medium | high | urgent
- confidence: 0.5-1.0
- context: Snippet from transcript
- timestampSeconds: When mentioned (if audio)`;

/**
 * Prompt for parsing deadline text to ISO timestamps
 */
export const DEADLINE_PARSING_PROMPT = `You are a date parser. Convert natural language deadline mentions into ISO 8601 timestamps.

TODAY'S DATE: {currentDate}

RULES:
- "today", "ASAP", "urgent", "immediately" → today at 5:00 PM
- "tonight" → today at 11:59 PM
- "tomorrow" → tomorrow at 5:00 PM
- "next [weekday]" → next occurrence of that weekday at 5:00 PM
  (e.g., if today is Monday and text says "next Friday", return this Friday at 5pm)
- "this week" → this Friday at 5:00 PM
- "next week" → next Monday at 5:00 PM
- "end of month" → last day of current month at 5:00 PM
- "end of week" → this Friday at 5:00 PM
- Specific dates: parse literally (e.g., "December 15" → Dec 15 this year at 5pm)

If the deadline text is vague or unclear, return null.

Return:
- timestamp: ISO 8601 string or null
- reasoning: Brief explanation of your interpretation`;
```

### File: `convex/ai/taskExtraction.ts` (NEW)

```typescript
"use node"; // Required for AI SDK

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { TASK_EXTRACTION_PROMPT, DEADLINE_PARSING_PROMPT } from "../../src/lib/prompts/taskExtraction";

// Task schema for LLM output
const TaskSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().optional(),
  deadlineText: z.string().optional(),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional(),
  confidence: z.number().min(0.5).max(1.0),
  context: z.string(),
  timestampSeconds: z.number().optional(),
});

/**
 * Extract tasks from transcript using LLM
 */
export const extractTasksFromTranscript = action({
  args: {
    transcript: v.string(),
    sourceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = ((await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.lib.helpers.getCurrentUser
    )) as any);

    if (!user) throw new Error("Not authenticated");

    // Generate structured output
    const result = await generateObject({
      model: getModel("openai:gpt-4o-mini"),
      schema: z.object({
        tasks: z.array(TaskSchema),
      }),
      temperature: 0.3, // Lower temp for consistency
      providerOptions: getGatewayOptions("openai:gpt-4o-mini", undefined, ["task-extraction"]),
      prompt: `${TASK_EXTRACTION_PROMPT}\n\nTRANSCRIPT:\n${args.transcript}`,
    });

    // Parse deadlines for each task
    const tasksWithDeadlines = await Promise.all(
      result.object.tasks.map(async (task) => {
        let deadline: number | undefined;

        if (task.deadlineText) {
          deadline = ((await (ctx.runAction as any)(
            // @ts-ignore
            internal.ai.taskExtraction.parseDeadline,
            { text: task.deadlineText }
          )) as number | undefined);
        }

        return {
          title: task.title,
          description: task.description,
          deadline,
          deadlineSource: task.deadlineText,
          urgency: task.urgency,
          sourceType: "transcript" as const,
          sourceId: args.sourceId,
          sourceContext: {
            snippet: task.context,
            timestamp: task.timestampSeconds,
            confidence: task.confidence,
          },
        };
      })
    );

    return tasksWithDeadlines;
  },
});

/**
 * Parse natural language deadline to ISO timestamp
 */
export const parseDeadline = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const currentDate = new Date().toISOString();
    const prompt = DEADLINE_PARSING_PROMPT
      .replace("{currentDate}", currentDate)
      + `\n\nDEADLINE TEXT: "${args.text}"`;

    const result = await generateObject({
      model: getModel("openai:gpt-4o-mini"),
      schema: z.object({
        timestamp: z.string().nullable(),
        reasoning: z.string(),
      }),
      temperature: 0.1,
      providerOptions: getGatewayOptions("openai:gpt-4o-mini", undefined, ["deadline-parsing"]),
      prompt,
    });

    if (!result.object.timestamp) return undefined;

    try {
      return new Date(result.object.timestamp).getTime();
    } catch {
      return undefined;
    }
  },
});
```

## Implementation Part 3: Task Auto-Tagging

### File: `convex/tasks/tags.ts` (NEW)

```typescript
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { TAG_EXTRACTION_MODEL } from "../../src/lib/ai/operational-models";
import { buildAutoTagPrompt } from "../lib/prompts/operational/tagExtraction";
import { findSimilarTag } from "../tags/matching";
import type { Doc } from "../_generated/dataModel";

const tagSchema = z.object({
  tags: z.array(z.string().min(2).max(30)).min(1).max(3),
});

/**
 * Auto-tag task (reuses notes auto-tagging pattern)
 */
export const extractAndApplyTaskTags = internalAction({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    // Get task
    const task = (await (ctx.runQuery as any)(
      // @ts-ignore
      internal.lib.helpers.getTask,
      { taskId },
    )) as Doc<"tasks"> | null;

    if (!task) throw new Error("Task not found");

    // Combine title + description
    const content = `${task.title} ${task.description || ""}`;

    if (content.length < 10) {
      return { appliedTags: [] };
    }

    // Get user's existing tags
    const existingTags = await ((ctx.runQuery as any)(
      // @ts-ignore
      internal.tags.queries.getAllUserTags,
      {},
    )) as Doc<"tags">[];

    const popularTags = existingTags
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 20)
      .map((t) => ({ displayName: t.displayName, usageCount: t.usageCount }));

    // LLM extraction
    const result = await generateObject({
      model: getModel(TAG_EXTRACTION_MODEL.id),
      schema: tagSchema,
      temperature: 0.3,
      providerOptions: getGatewayOptions(TAG_EXTRACTION_MODEL.id, undefined, [
        "task-auto-tagging",
      ]),
      prompt: buildAutoTagPrompt(content, popularTags),
    });

    // Three-tier matching
    const embeddingCache = new Map<string, number[]>();
    const finalTags: string[] = [];

    for (const candidateTag of result.object.tags) {
      if (finalTags.length >= 3) break;

      const match = await findSimilarTag(
        ctx,
        candidateTag,
        task.userId,
        existingTags,
        embeddingCache,
      );

      let tagToApply: string;

      if (match.matchType !== "none" && match.existingTag) {
        // Reuse existing tag
        tagToApply = match.existingTag.displayName;
      } else {
        // Create new tag
        tagToApply = candidateTag;
        await ((ctx.runMutation as any)(
          // @ts-ignore
          internal.tags.mutations.create,
          { displayName: candidateTag },
        ));
      }

      if (!finalTags.includes(tagToApply)) {
        finalTags.push(tagToApply);

        // Apply tag to task (dual-write: junction + increment usageCount)
        await ((ctx.runMutation as any)(
          // @ts-ignore
          internal.tasks.tags.applyTagToTask,
          { taskId, tagDisplayName: tagToApply },
        ));
      }
    }

    return { appliedTags: finalTags };
  },
});

// Helper mutation (internal)
export const applyTagToTask = internalMutation({
  args: {
    taskId: v.id("tasks"),
    tagDisplayName: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Find tag by display name
    const tag = await ctx.db
      .query("tags")
      .filter((q) =>
        q.and(
          q.eq(q.field("displayName"), args.tagDisplayName),
          q.eq(q.field("userId"), task.userId),
        )
      )
      .first();

    if (!tag) throw new Error("Tag not found");

    // Check if already linked
    const existing = await ctx.db
      .query("taskTags")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .filter((q) => q.eq(q.field("tagId"), tag._id))
      .first();

    if (existing) return; // Already tagged

    // Create junction
    await ctx.db.insert("taskTags", {
      taskId: args.taskId,
      tagId: tag._id,
      userId: task.userId,
      addedAt: Date.now(),
    });

    // Increment tag usage count
    await ctx.db.patch(tag._id, {
      usageCount: tag.usageCount + 1,
    });
  },
});
```

## Testing

### 1. Test CRUD Operations

```bash
# In Convex dashboard Functions tab

# Create task
await ctx.runMutation(api.tasks.createTask, {
  title: "Test task",
  description: "This is a test",
  urgency: "medium",
});

# List tasks
await ctx.runQuery(api.tasks.listTasks, {});

# Complete task
await ctx.runMutation(api.tasks.completeTask, {
  taskId: "<task-id>",
});
```

### 2. Test Task Extraction

```typescript
const transcript = `
Meeting notes from standup:
- John needs to update the landing page by Friday
- Sarah will fix the login bug ASAP
- We should schedule a design review next week
`;

const tasks = await ctx.runAction(api.ai.taskExtraction.extractTasksFromTranscript, {
  transcript,
});

console.log(tasks);
// Should extract 3 tasks with deadlines
```

### 3. Test Auto-Tagging

```typescript
// Create task with content that should match existing tags
const taskId = await ctx.runMutation(api.tasks.createTask, {
  title: "Fix authentication bug in login flow",
});

// Trigger auto-tagging
await ctx.runAction(internal.tasks.tags.extractAndApplyTaskTags, {
  taskId,
});

// Check applied tags
const taskTags = await ctx.db
  .query("taskTags")
  .withIndex("by_task", (q) => q.eq("taskId", taskId))
  .collect();

console.log(taskTags); // Should have tags like "authentication", "bug", etc.
```

## Success Criteria

- [ ] Can create, update, delete tasks via mutations
- [ ] Can query tasks by user, status, project, deadline
- [ ] Task extraction returns 3+ tasks from sample transcript
- [ ] Deadline parsing works ("next Friday" → correct ISO date)
- [ ] Auto-tagging applies 1-3 relevant tags
- [ ] Activity events created on task actions
- [ ] All type errors resolved with `@ts-ignore` where needed

## Next Phase

**Phase 3: Project Expansion Backend** - Junction operations, resource queries, activity feed

Tasks backend complete. Projects will link to tasks via `projectId` field.

## Reference Files

- Memory extraction pattern: `convex/memories/extract.ts`
- Auto-tagging pattern: `convex/notes/tags.ts`
- Tag matching logic: `convex/tags/matching.ts`
- Projects CRUD: `convex/projects.ts`
- AI models config: `src/lib/ai/operational-models.ts`
