import {
  attachments,
  conversations,
  notes,
  projects,
  tasks,
} from "@blah-chat/persistence-postgres";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NotFoundError } from "@/lib/api/errors";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

type ProjectRecord = typeof projects.$inferSelect;

export type ApiProject = {
  _id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
};

export type ApiProjectStats = {
  conversationCount: number;
  noteCount: number;
  fileCount: number;
  activeTaskCount: number;
  taskStats: {
    total: number;
    active: number;
    completed: number;
  };
  lastActivityAt: number;
};

export type ApiProjectAttachment = {
  _id: string;
  _creationTime: number;
  messageId: string;
  conversationId: string;
  type: "file" | "image" | "audio";
  storageId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
};

function toApiProject(project: ProjectRecord): ApiProject {
  return {
    _id: project.id,
    name: project.name,
    description: project.description ?? undefined,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

async function assertOwnedProject(clerkUserId: string, projectId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  });

  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  return { db, user, project };
}

export async function listProjects(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const rows = await db.query.projects.findMany({
    where: and(eq(projects.userId, user.id), eq(projects.isTemplate, false)),
    orderBy: [desc(projects.updatedAt)],
  });

  return rows.map(toApiProject);
}

export async function listProjectTemplates(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const rows = await db.query.projects.findMany({
    where: and(eq(projects.userId, user.id), eq(projects.isTemplate, true)),
    orderBy: [desc(projects.updatedAt)],
  });

  return rows.map(toApiProject);
}

export async function getProject(clerkUserId: string, projectId: string) {
  const { project } = await assertOwnedProject(clerkUserId, projectId);
  return toApiProject(project);
}

export async function getProjectStats(clerkUserId: string, projectId: string) {
  const { db, project } = await assertOwnedProject(clerkUserId, projectId);

  const [projectConversations, projectNotes, projectTasks] = await Promise.all([
    db.query.conversations.findMany({
      where: eq(conversations.projectId, project.id),
      orderBy: [desc(conversations.updatedAt)],
    }),
    db.query.notes.findMany({
      where: eq(notes.projectId, project.id),
      orderBy: [desc(notes.updatedAt)],
    }),
    db.query.tasks.findMany({
      where: eq(tasks.projectId, project.id),
      orderBy: [desc(tasks.updatedAt)],
    }),
  ]);

  const conversationIds = projectConversations.map(
    (conversation) => conversation.id,
  );
  const projectAttachments =
    conversationIds.length === 0
      ? []
      : await db.query.attachments.findMany({
          where: inArray(attachments.conversationId, conversationIds),
        });

  const completedTaskCount = projectTasks.filter(
    (task) => task.status === "completed",
  ).length;
  const activeTaskCount = projectTasks.filter(
    (task) => task.status !== "completed" && task.status !== "cancelled",
  ).length;
  const lastActivityAt = Math.max(
    project.updatedAt,
    ...projectConversations.map((conversation) => conversation.updatedAt),
    ...projectNotes.map((note) => note.updatedAt),
    ...projectTasks.map((task) => task.updatedAt),
  );

  return {
    conversationCount: projectConversations.length,
    noteCount: projectNotes.length,
    fileCount: projectAttachments.length,
    activeTaskCount,
    taskStats: {
      total: projectTasks.length,
      active: activeTaskCount,
      completed: completedTaskCount,
    },
    lastActivityAt,
  } satisfies ApiProjectStats;
}

export async function createProject(
  clerkUserId: string,
  input: {
    name: string;
    description?: string;
    systemPrompt?: string;
    isTemplate?: boolean;
  },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const [row] = await db
    .insert(projects)
    .values({
      userId: user.id,
      name: input.name,
      description: input.description ?? null,
      systemPrompt: input.systemPrompt ?? null,
      isTemplate: input.isTemplate ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create project");
  }

  return toApiProject(row);
}

export async function updateProject(
  clerkUserId: string,
  projectId: string,
  input: {
    name?: string;
    description?: string;
    systemPrompt?: string;
  },
) {
  const { db, project } = await assertOwnedProject(clerkUserId, projectId);
  const [updated] = await db
    .update(projects)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description || null,
      }),
      ...(input.systemPrompt !== undefined && {
        systemPrompt: input.systemPrompt || null,
      }),
      updatedAt: Date.now(),
    })
    .where(eq(projects.id, project.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update project");
  }

  return toApiProject(updated);
}

export async function deleteProject(clerkUserId: string, projectId: string) {
  const { db, project } = await assertOwnedProject(clerkUserId, projectId);

  // Unlink conversations from project before deleting
  await db
    .update(conversations)
    .set({ projectId: null })
    .where(eq(conversations.projectId, project.id));

  await db.delete(projects).where(eq(projects.id, project.id));
  return { deleted: true, projectId: project.id };
}

export async function assignConversationsToProject(
  clerkUserId: string,
  input: {
    projectId: string | null;
    conversationIds: string[];
  },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);

  // If assigning to a project, verify ownership
  if (input.projectId) {
    await assertOwnedProject(clerkUserId, input.projectId);
  }

  // Verify all conversations belong to user
  const ownedConversations = await db.query.conversations.findMany({
    where: and(
      eq(conversations.userId, user.id),
      inArray(conversations.id, input.conversationIds),
    ),
  });

  if (ownedConversations.length === 0) {
    return { assigned: 0 };
  }

  const ownedIds = ownedConversations.map((c) => c.id);
  await db
    .update(conversations)
    .set({
      projectId: input.projectId,
      updatedAt: Date.now(),
    })
    .where(inArray(conversations.id, ownedIds));

  return { assigned: ownedIds.length };
}

export async function listProjectAttachments(
  clerkUserId: string,
  projectId: string,
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const ownedConversations = await db.query.conversations.findMany({
    where: and(
      eq(conversations.userId, user.id),
      eq(conversations.projectId, projectId),
    ),
  });

  if (ownedConversations.length === 0) {
    return [] as ApiProjectAttachment[];
  }

  const rows = await db.query.attachments.findMany({
    where: inArray(
      attachments.conversationId,
      ownedConversations.map((conversation) => conversation.id),
    ),
    orderBy: [desc(attachments.createdAt)],
  });

  return rows.map((row) => ({
    _id: row.id,
    _creationTime: row.createdAt,
    messageId: row.messageId,
    conversationId: row.conversationId,
    type: row.type as "file" | "image" | "audio",
    storageId: row.key,
    name: row.name,
    mimeType: row.mimeType,
    size: row.size,
    createdAt: row.createdAt,
  }));
}
