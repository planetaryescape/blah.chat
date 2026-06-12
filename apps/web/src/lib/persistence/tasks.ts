import {
  createTriggerClient,
  parsePersistenceEnv,
  tasks,
} from "@blah-chat/persistence-postgres";
import { and, desc, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/api/errors";
import logger from "@/lib/logger";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

type ProjectTaskRecord = typeof tasks.$inferSelect;

export type ApiProjectTask = {
  _id: string;
  title: string;
  description?: string;
  status: "suggested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  urgency?: "low" | "medium" | "high" | "urgent";
  deadline?: number;
  deadlineSource?: string;
  projectId?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};

function normalizeTags(tags: string[] | undefined) {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
}

function toApiProjectTask(task: ProjectTaskRecord): ApiProjectTask {
  return {
    _id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status as ApiProjectTask["status"],
    urgency: task.urgency as ApiProjectTask["urgency"],
    deadline: task.deadline ?? undefined,
    deadlineSource: task.deadlineSource ?? undefined,
    projectId: task.projectId ?? undefined,
    tags: task.tags ?? [],
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt ?? undefined,
  };
}

async function assertOwnedProjectTask(
  clerkUserId: string,
  projectId: string,
  taskId: string,
) {
  const { task } = await assertOwnedTask(clerkUserId, taskId);
  if (task.projectId !== projectId) {
    throw new NotFoundError("Task", taskId);
  }

  return {
    db: getPersistenceDb(),
    user: await ensureCurrentPersistenceUser(clerkUserId),
    task,
  };
}

async function assertOwnedTask(clerkUserId: string, taskId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, user.id)),
  });

  if (!task) {
    throw new NotFoundError("Task", taskId);
  }

  return { db, user, task };
}

export async function listProjectTasks(clerkUserId: string, projectId: string) {
  return listTasks(clerkUserId, { projectId });
}

export async function listTasks(
  clerkUserId: string,
  input: { projectId?: string | null } = {},
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const rows = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, user.id),
      input.projectId === undefined
        ? undefined
        : input.projectId === null
          ? eq(tasks.projectId, null as never)
          : eq(tasks.projectId, input.projectId),
    ),
    orderBy: [desc(tasks.updatedAt)],
  });

  return rows.map(toApiProjectTask);
}

export async function createProjectTask(
  clerkUserId: string,
  projectId: string,
  input: {
    title: string;
    description?: string;
    status?:
      | "suggested"
      | "confirmed"
      | "in_progress"
      | "completed"
      | "cancelled";
    urgency?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
    deadlineSource?: string;
    tags?: string[];
  },
) {
  return createTask(clerkUserId, { ...input, projectId });
}

export async function createTask(
  clerkUserId: string,
  input: {
    title: string;
    description?: string;
    status?:
      | "suggested"
      | "confirmed"
      | "in_progress"
      | "completed"
      | "cancelled";
    urgency?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
    deadlineSource?: string;
    tags?: string[];
    projectId?: string | null;
  },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const now = Date.now();
  const status = input.status ?? "in_progress";

  const [task] = await db
    .insert(tasks)
    .values({
      userId: user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status,
      urgency: input.urgency ?? null,
      deadline: input.deadline ?? null,
      deadlineSource: input.deadlineSource ?? null,
      tags: normalizeTags(input.tags),
      projectId: input.projectId ?? null,
      completedAt: status === "completed" ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!task) {
    throw new Error("Failed to create task");
  }

  // Fire-and-forget embedding generation
  const trigger = createTriggerClient(parsePersistenceEnv(process.env));
  trigger
    .triggerTask("embed-task", { taskId: task.id }, { concurrencyKey: task.id })
    .catch((err) => {
      logger.warn({ err, taskId: task.id }, "Failed to enqueue embed-task");
    });

  return toApiProjectTask(task);
}

export async function updateProjectTask(
  clerkUserId: string,
  projectId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string;
    status?:
      | "suggested"
      | "confirmed"
      | "in_progress"
      | "completed"
      | "cancelled";
    urgency?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
    deadlineSource?: string;
    tags?: string[];
  },
) {
  await assertOwnedProjectTask(clerkUserId, projectId, taskId);
  return updateTask(clerkUserId, taskId, input);
}

export async function updateTask(
  clerkUserId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string;
    status?:
      | "suggested"
      | "confirmed"
      | "in_progress"
      | "completed"
      | "cancelled";
    urgency?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
    deadlineSource?: string;
    tags?: string[];
  },
) {
  const { db, task } = await assertOwnedTask(clerkUserId, taskId);
  const nextStatus = input.status ?? (task.status as ApiProjectTask["status"]);
  const completedAt =
    nextStatus === "completed" ? (task.completedAt ?? Date.now()) : null;

  const [updated] = await db
    .update(tasks)
    .set({
      title: input.title?.trim() || task.title,
      description:
        input.description !== undefined
          ? input.description.trim() || null
          : task.description,
      status: nextStatus,
      urgency:
        input.urgency !== undefined ? input.urgency : (task.urgency ?? null),
      deadline: input.deadline !== undefined ? input.deadline : task.deadline,
      deadlineSource:
        input.deadlineSource !== undefined
          ? input.deadlineSource
          : task.deadlineSource,
      tags: input.tags !== undefined ? normalizeTags(input.tags) : task.tags,
      completedAt,
      updatedAt: Date.now(),
    })
    .where(eq(tasks.id, task.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update task");
  }

  // Re-embed on title/description change
  if (input.title !== undefined || input.description !== undefined) {
    const trigger = createTriggerClient(parsePersistenceEnv(process.env));
    trigger
      .triggerTask(
        "embed-task",
        { taskId: updated.id },
        { concurrencyKey: updated.id },
      )
      .catch((err) => {
        logger.warn(
          { err, taskId: updated.id },
          "Failed to enqueue embed-task",
        );
      });
  }

  return toApiProjectTask(updated);
}

export async function deleteProjectTask(
  clerkUserId: string,
  projectId: string,
  taskId: string,
) {
  await assertOwnedProjectTask(clerkUserId, projectId, taskId);
  return deleteTask(clerkUserId, taskId);
}

export async function deleteTask(clerkUserId: string, taskId: string) {
  const { db, task } = await assertOwnedTask(clerkUserId, taskId);
  await db.delete(tasks).where(eq(tasks.id, task.id));
  return { deleted: true, taskId: task.id };
}
