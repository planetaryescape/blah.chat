/**
 * Backend Action: Task Manager
 *
 * Handles all task management operations for the LLM tool.
 * Supports create, update, complete, delete, and list operations.
 */

import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { DEADLINE_PARSING_MODEL } from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { DEADLINE_PARSING_PROMPT } from "@/lib/prompts/taskExtraction";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction, internalQuery } from "../_generated/server";

// Status and urgency types
type TaskStatus =
  | "suggested"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";
type TaskUrgency = "low" | "medium" | "high" | "urgent";

// Result types
interface TaskResult {
  id: string;
  title: string;
  status: TaskStatus;
  urgency?: TaskUrgency;
  deadline?: string;
  projectId?: string;
  url: string;
}

interface OperationResult {
  success: boolean;
  operation: string;
  message: string;
  task?: TaskResult;
  tasks?: TaskResult[];
  totalCount?: number;
  pendingDelete?: boolean;
  deleted?: boolean;
  ambiguous?: boolean;
  candidates?: TaskResult[];
  error?: string;
}

/**
 * Find tasks by title (fuzzy match)
 */
export const findTasksByTitle = internalQuery({
  args: {
    userId: v.id("users"),
    titleQuery: v.string(),
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Doc<"tasks">[]> => {
    const limit = args.limit ?? 10;
    const queryLower = args.titleQuery.toLowerCase();

    // Get tasks for user (optionally filtered by project)
    let tasks: Doc<"tasks">[];
    if (args.projectId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
    } else {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
    }

    // Filter by title match (case-insensitive substring)
    const matches = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(queryLower) ||
        queryLower.includes(t.title.toLowerCase()),
    );

    // Sort by relevance (exact match first, then by length similarity)
    return matches
      .sort((a, b) => {
        const aExact = a.title.toLowerCase() === queryLower;
        const bExact = b.title.toLowerCase() === queryLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        // Prefer shorter titles that still match
        return a.title.length - b.title.length;
      })
      .slice(0, limit);
  },
});

/**
 * Get a task by ID
 */
export const getTaskById = internalQuery({
  args: {
    userId: v.id("users"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args): Promise<Doc<"tasks"> | null> => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== args.userId) {
      return null;
    }
    return task;
  },
});

/**
 * List tasks with filters
 */
export const listTasks = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Doc<"tasks">[]> => {
    const limit = args.limit ?? 10;

    let tasks: Doc<"tasks">[];

    // Apply status filter if provided
    if (args.status) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status as TaskStatus),
        )
        .collect();
    } else {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
    }

    // Apply project filter
    if (args.projectId !== undefined) {
      tasks = tasks.filter((t) => t.projectId === args.projectId);
    }

    // Exclude completed/cancelled for general list unless specifically requested
    if (!args.status) {
      tasks = tasks.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled",
      );
    }

    // Sort by deadline (ascending), then by createdAt (descending)
    return tasks
      .sort((a, b) => {
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;
        if (a.deadline && b.deadline) return a.deadline - b.deadline;
        return b.createdAt - a.createdAt;
      })
      .slice(0, limit);
  },
});

/**
 * Parse natural language deadline to timestamp
 */
async function parseDeadline(deadlineText: string): Promise<number | null> {
  const now = new Date();
  const currentDateStr = now.toISOString();

  const prompt = DEADLINE_PARSING_PROMPT.replace(
    "{{CURRENT_DATE}}",
    currentDateStr,
  );

  try {
    const result = await generateObject({
      model: getModel(DEADLINE_PARSING_MODEL.id),
      schema: z.object({ timestamp: z.string().nullable() }),
      providerOptions: getGatewayOptions(DEADLINE_PARSING_MODEL.id, undefined, [
        "deadline-parsing",
      ]),
      prompt: `${prompt}\n\nDeadline text: "${deadlineText}"`,
    });

    if (result.object.timestamp) {
      return new Date(result.object.timestamp).getTime();
    }
    return null;
  } catch (error) {
    console.error("[TaskManager] Error parsing deadline:", error);
    return null;
  }
}

/**
 * Format task for result
 */
function formatTaskResult(task: Doc<"tasks">): TaskResult {
  return {
    id: task._id,
    title: task.title,
    status: task.status as TaskStatus,
    urgency: task.urgency as TaskUrgency | undefined,
    deadline: task.deadline ? new Date(task.deadline).toISOString() : undefined,
    projectId: task.projectId || undefined,
    url: task.projectId
      ? `/projects/${task.projectId}/tasks?task=${task._id}`
      : `/tasks?task=${task._id}`,
  };
}

/**
 * Main task manager action
 */
export const execute = internalAction({
  args: {
    userId: v.id("users"),
    operation: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("complete"),
      v.literal("delete"),
      v.literal("list"),
    ),
    projectId: v.optional(v.id("projects")),

    // For create
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    deadline: v.optional(v.string()),
    urgency: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),

    // For update/complete/delete - task identification
    taskId: v.optional(v.string()),
    taskTitle: v.optional(v.string()),

    // For delete - confirmation
    confirmDelete: v.optional(v.boolean()),

    // For update - new values
    newTitle: v.optional(v.string()),
    newDescription: v.optional(v.string()),
    newDeadline: v.optional(v.string()),
    newUrgency: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
    newStatus: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),

    // For list
    status: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<OperationResult> => {
    const { operation } = args;

    try {
      switch (operation) {
        case "create":
          return await handleCreate(ctx, args);
        case "update":
          return await handleUpdate(ctx, args);
        case "complete":
          return await handleComplete(ctx, args);
        case "delete":
          return await handleDelete(ctx, args);
        case "list":
          return await handleList(ctx, args);
        default:
          return {
            success: false,
            operation,
            message: `Unknown operation: ${operation}`,
            error: "Invalid operation",
          };
      }
    } catch (error) {
      console.error(`[TaskManager] ${operation} failed:`, error);
      return {
        success: false,
        operation,
        message: error instanceof Error ? error.message : "Operation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Handle create operation
 */
async function handleCreate(
  ctx: any,
  args: {
    userId: Id<"users">;
    projectId?: Id<"projects">;
    title?: string;
    description?: string;
    deadline?: string;
    urgency?: TaskUrgency;
  },
): Promise<OperationResult> {
  if (!args.title) {
    return {
      success: false,
      operation: "create",
      message: "Task title is required",
      error: "Missing title",
    };
  }

  // Parse deadline if provided
  let deadlineTimestamp: number | undefined;
  if (args.deadline) {
    const parsed = await parseDeadline(args.deadline);
    if (parsed) {
      deadlineTimestamp = parsed;
    }
  }

  // Create task via mutation
  const taskId = (await (ctx.runMutation as any)(
    // @ts-ignore - TypeScript recursion limit
    internal.tasks.createInternal,
    {
      userId: args.userId,
      title: args.title,
      description: args.description,
      deadline: deadlineTimestamp,
      deadlineSource: args.deadline,
      urgency: args.urgency,
      projectId: args.projectId,
      sourceType: "conversation",
    },
  )) as Id<"tasks">;

  // Fetch the created task
  const task = (await (ctx.runQuery as any)(
    // @ts-ignore - TypeScript recursion limit
    internal.tools.taskManager.getTaskById,
    { userId: args.userId, taskId },
  )) as Doc<"tasks"> | null;

  if (!task) {
    return {
      success: false,
      operation: "create",
      message: "Task created but failed to retrieve",
      error: "Retrieval failed",
    };
  }

  return {
    success: true,
    operation: "create",
    message: `Created task: "${args.title}"`,
    task: formatTaskResult(task),
  };
}

/**
 * Resolve task from ID or title
 */
async function resolveTask(
  ctx: any,
  args: {
    userId: Id<"users">;
    taskId?: string;
    taskTitle?: string;
    projectId?: Id<"projects">;
  },
): Promise<
  | { task: Doc<"tasks"> }
  | { ambiguous: true; candidates: Doc<"tasks">[] }
  | { notFound: true }
> {
  // If taskId provided, use it directly
  if (args.taskId) {
    const task = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.tools.taskManager.getTaskById,
      { userId: args.userId, taskId: args.taskId as Id<"tasks"> },
    )) as Doc<"tasks"> | null;

    if (task) {
      return { task };
    }
    return { notFound: true };
  }

  // If taskTitle provided, search by title
  if (args.taskTitle) {
    const matches = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.tools.taskManager.findTasksByTitle,
      {
        userId: args.userId,
        titleQuery: args.taskTitle,
        projectId: args.projectId,
        limit: 5,
      },
    )) as Doc<"tasks">[];

    if (matches.length === 0) {
      return { notFound: true };
    }

    if (matches.length === 1) {
      return { task: matches[0] };
    }

    // Multiple matches - ambiguous
    return { ambiguous: true, candidates: matches };
  }

  return { notFound: true };
}

/**
 * Handle update operation
 */
async function handleUpdate(
  ctx: any,
  args: {
    userId: Id<"users">;
    projectId?: Id<"projects">;
    taskId?: string;
    taskTitle?: string;
    newTitle?: string;
    newDescription?: string;
    newDeadline?: string;
    newUrgency?: TaskUrgency;
    newStatus?: TaskStatus;
  },
): Promise<OperationResult> {
  const resolved = await resolveTask(ctx, args);

  if ("notFound" in resolved) {
    return {
      success: false,
      operation: "update",
      message: args.taskTitle
        ? `No task found matching "${args.taskTitle}"`
        : "Task not found",
      error: "Task not found",
    };
  }

  if ("ambiguous" in resolved) {
    return {
      success: false,
      operation: "update",
      message: "Multiple tasks match. Please specify which one.",
      ambiguous: true,
      candidates: resolved.candidates.map(formatTaskResult),
    };
  }

  const { task } = resolved;

  // Parse new deadline if provided
  let deadlineTimestamp: number | undefined;
  if (args.newDeadline) {
    const parsed = await parseDeadline(args.newDeadline);
    if (parsed) {
      deadlineTimestamp = parsed;
    }
  }

  // Build update object
  const updates: Record<string, any> = {};
  if (args.newTitle) updates.title = args.newTitle;
  if (args.newDescription) updates.description = args.newDescription;
  if (deadlineTimestamp) {
    updates.deadline = deadlineTimestamp;
    updates.deadlineSource = args.newDeadline;
  }
  if (args.newUrgency) updates.urgency = args.newUrgency;
  if (args.newStatus) updates.status = args.newStatus;

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      operation: "update",
      message: "No updates provided",
      error: "Nothing to update",
    };
  }

  // Update via mutation
  await (ctx.runMutation as any)(
    // @ts-ignore - TypeScript recursion limit
    internal.tasks.updateInternal,
    {
      id: task._id,
      userId: args.userId,
      ...updates,
    },
  );

  // Fetch updated task
  const updatedTask = (await (ctx.runQuery as any)(
    // @ts-ignore - TypeScript recursion limit
    internal.tools.taskManager.getTaskById,
    { userId: args.userId, taskId: task._id },
  )) as Doc<"tasks"> | null;

  const changedFields = Object.keys(updates).join(", ");
  return {
    success: true,
    operation: "update",
    message: `Updated ${changedFields} on "${task.title}"`,
    task: updatedTask ? formatTaskResult(updatedTask) : formatTaskResult(task),
  };
}

/**
 * Handle complete operation
 */
async function handleComplete(
  ctx: any,
  args: {
    userId: Id<"users">;
    projectId?: Id<"projects">;
    taskId?: string;
    taskTitle?: string;
  },
): Promise<OperationResult> {
  const resolved = await resolveTask(ctx, args);

  if ("notFound" in resolved) {
    return {
      success: false,
      operation: "complete",
      message: args.taskTitle
        ? `No task found matching "${args.taskTitle}"`
        : "Task not found",
      error: "Task not found",
    };
  }

  if ("ambiguous" in resolved) {
    return {
      success: false,
      operation: "complete",
      message: "Multiple tasks match. Please specify which one.",
      ambiguous: true,
      candidates: resolved.candidates.map(formatTaskResult),
    };
  }

  const { task } = resolved;

  // Complete via mutation
  await (ctx.runMutation as any)(
    // @ts-ignore - TypeScript recursion limit
    internal.tasks.completeInternal,
    { id: task._id, userId: args.userId },
  );

  return {
    success: true,
    operation: "complete",
    message: `Completed: "${task.title}"`,
    task: { ...formatTaskResult(task), status: "completed" },
  };
}

/**
 * Handle delete operation (with confirmation)
 */
async function handleDelete(
  ctx: any,
  args: {
    userId: Id<"users">;
    projectId?: Id<"projects">;
    taskId?: string;
    taskTitle?: string;
    confirmDelete?: boolean;
  },
): Promise<OperationResult> {
  const resolved = await resolveTask(ctx, args);

  if ("notFound" in resolved) {
    return {
      success: false,
      operation: "delete",
      message: args.taskTitle
        ? `No task found matching "${args.taskTitle}"`
        : "Task not found",
      error: "Task not found",
    };
  }

  if ("ambiguous" in resolved) {
    return {
      success: false,
      operation: "delete",
      message: "Multiple tasks match. Please specify which one.",
      ambiguous: true,
      candidates: resolved.candidates.map(formatTaskResult),
    };
  }

  const { task } = resolved;

  // If not confirmed, return preview
  if (!args.confirmDelete) {
    return {
      success: true,
      operation: "delete",
      message: `Found task: "${task.title}". Call again with confirmDelete: true to delete.`,
      pendingDelete: true,
      task: formatTaskResult(task),
    };
  }

  // Delete via mutation
  await (ctx.runMutation as any)(
    // @ts-ignore - TypeScript recursion limit
    internal.tasks.deleteInternal,
    { id: task._id, userId: args.userId },
  );

  return {
    success: true,
    operation: "delete",
    message: `Deleted: "${task.title}"`,
    deleted: true,
    task: formatTaskResult(task),
  };
}

/**
 * Handle list operation
 */
async function handleList(
  ctx: any,
  args: {
    userId: Id<"users">;
    projectId?: Id<"projects">;
    status?: TaskStatus;
    limit?: number;
  },
): Promise<OperationResult> {
  const limit = args.limit ?? 10;

  const tasks = (await (ctx.runQuery as any)(
    // @ts-ignore - TypeScript recursion limit
    internal.tools.taskManager.listTasks,
    {
      userId: args.userId,
      projectId: args.projectId,
      status: args.status,
      limit,
    },
  )) as Doc<"tasks">[];

  if (tasks.length === 0) {
    let message = "No tasks found";
    if (args.status) {
      message = `No ${args.status} tasks found`;
    }
    if (args.projectId) {
      message += " in this project";
    }

    return {
      success: true,
      operation: "list",
      message,
      tasks: [],
      totalCount: 0,
    };
  }

  return {
    success: true,
    operation: "list",
    message: `Found ${tasks.length} task${tasks.length === 1 ? "" : "s"}`,
    tasks: tasks.map(formatTaskResult),
    totalCount: tasks.length,
  };
}
