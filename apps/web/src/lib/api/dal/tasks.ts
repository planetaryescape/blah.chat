import { z } from "zod";
import {
  createProjectTask,
  createTask,
  deleteProjectTask,
  deleteTask,
  listProjectTasks,
  listTasks,
  updateProjectTask,
  updateTask,
} from "@/lib/persistence/tasks";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

const taskStatus = z.enum([
  "suggested",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

const taskUrgency = z.enum(["low", "medium", "high", "urgent"]);

const createProjectTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().max(64_000).optional(),
  status: taskStatus.optional(),
  urgency: taskUrgency.optional(),
  deadline: z.number().int().optional(),
  deadlineSource: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateProjectTaskSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().max(64_000).optional(),
  status: taskStatus.optional(),
  urgency: taskUrgency.optional(),
  deadline: z.number().int().optional(),
  deadlineSource: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const tasksDAL = {
  list: async (
    clerkUserId: string,
    query: { projectId?: string | null } = {},
  ) => {
    const items = await listTasks(clerkUserId, query);
    return formatEntityList(items, "task");
  },

  listProject: async (clerkUserId: string, projectId: string) => {
    const items = await listProjectTasks(clerkUserId, projectId);
    return formatEntityList(items, "task");
  },

  create: async (
    clerkUserId: string,
    payload: z.input<typeof createProjectTaskSchema> & {
      projectId?: string | null;
    },
  ) => {
    const validated = createProjectTaskSchema
      .extend({
        projectId: z.string().optional().nullable(),
      })
      .parse(payload);
    const task = await createTask(clerkUserId, validated);
    return formatEntity(task, "task", task._id);
  },

  createProject: async (
    clerkUserId: string,
    projectId: string,
    payload: z.input<typeof createProjectTaskSchema>,
  ) => {
    const validated = createProjectTaskSchema.parse(payload);
    const task = await createProjectTask(clerkUserId, projectId, validated);
    return formatEntity(task, "task", task._id);
  },

  update: async (
    clerkUserId: string,
    taskId: string,
    payload: z.input<typeof updateProjectTaskSchema>,
  ) => {
    const validated = updateProjectTaskSchema.parse(payload);
    const task = await updateTask(clerkUserId, taskId, validated);
    return formatEntity(task, "task", task._id);
  },

  updateProject: async (
    clerkUserId: string,
    projectId: string,
    taskId: string,
    payload: z.input<typeof updateProjectTaskSchema>,
  ) => {
    const validated = updateProjectTaskSchema.parse(payload);
    const task = await updateProjectTask(
      clerkUserId,
      projectId,
      taskId,
      validated,
    );
    return formatEntity(task, "task", task._id);
  },

  delete: async (clerkUserId: string, taskId: string) => {
    const result = await deleteTask(clerkUserId, taskId);
    return formatEntity(result, "task", taskId);
  },

  deleteProject: async (
    clerkUserId: string,
    projectId: string,
    taskId: string,
  ) => {
    const result = await deleteProjectTask(clerkUserId, projectId, taskId);
    return formatEntity(result, "task", taskId);
  },
};
