/**
 * AI Tool: Task Manager
 *
 * Allows the LLM to manage user tasks via natural language.
 * Operations: create, update, complete, delete, list
 */

import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

export function createTaskManagerTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  projectId?: Id<"projects">,
) {
  return tool({
    description: `Manage user's tasks: create, update, complete, delete, or list tasks.

✅ USE FOR:
- "Add 'buy groceries' to my tasks"
- "That task is done" / "Mark X as complete"
- "Delete that task"
- "Change the deadline to Friday"
- "What tasks do I have?"
- "Show my urgent tasks"

📋 OPERATIONS:
- create: Add new task (requires title)
- update: Modify task fields (deadline, urgency, status, etc.)
- complete: Mark task as done
- delete: Remove task (requires confirmation - call twice)
- list: Show tasks (optionally filtered by status)

🎯 TASK RESOLUTION:
- Use taskId if you know the exact ID
- Use taskTitle for fuzzy matching by name
- If multiple tasks match, you'll receive candidates to disambiguate

⚠️ DELETE REQUIRES 2 CALLS:
1. First call: returns task preview
2. Second call with confirmDelete: true to actually delete`,

    inputSchema: z.object({
      operation: z
        .enum(["create", "update", "complete", "delete", "list"])
        .describe("The task operation to perform"),

      // For create
      title: z
        .string()
        .optional()
        .describe("Task title (required for create)"),
      description: z
        .string()
        .optional()
        .describe("Task description"),
      deadline: z
        .string()
        .optional()
        .describe("Deadline in natural language: 'tomorrow', 'next Friday', 'Dec 25'"),
      urgency: z
        .enum(["low", "medium", "high", "urgent"])
        .optional()
        .describe("Task urgency level"),

      // For update/complete/delete - task identification
      taskId: z
        .string()
        .optional()
        .describe("Exact task ID if known"),
      taskTitle: z
        .string()
        .optional()
        .describe("Task title for fuzzy matching"),

      // For delete - confirmation
      confirmDelete: z
        .boolean()
        .optional()
        .describe("Must be true on second call to confirm deletion"),

      // For update - new values
      newTitle: z
        .string()
        .optional()
        .describe("New title for the task"),
      newDescription: z
        .string()
        .optional()
        .describe("New description for the task"),
      newDeadline: z
        .string()
        .optional()
        .describe("New deadline in natural language"),
      newUrgency: z
        .enum(["low", "medium", "high", "urgent"])
        .optional()
        .describe("New urgency level"),
      newStatus: z
        .enum(["suggested", "confirmed", "in_progress", "completed", "cancelled"])
        .optional()
        .describe("New status for the task"),

      // For list
      status: z
        .enum(["suggested", "confirmed", "in_progress", "completed", "cancelled"])
        .optional()
        .describe("Filter tasks by status"),
      limit: z
        .number()
        .optional()
        .describe("Max number of tasks to return (default: 10)"),
    }),

    execute: async (input) => {
      const result = await ctx.runAction(internal.tools.taskManager.execute, {
        userId,
        projectId,
        operation: input.operation,
        title: input.title,
        description: input.description,
        deadline: input.deadline,
        urgency: input.urgency,
        taskId: input.taskId,
        taskTitle: input.taskTitle,
        confirmDelete: input.confirmDelete,
        newTitle: input.newTitle,
        newDescription: input.newDescription,
        newDeadline: input.newDeadline,
        newUrgency: input.newUrgency,
        newStatus: input.newStatus,
        status: input.status,
        limit: input.limit,
      });

      return result;
    },
  });
}
