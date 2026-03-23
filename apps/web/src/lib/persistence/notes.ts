import { notes } from "@blah-chat/persistence-postgres";
import { and, desc, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/api/errors";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

type ProjectNoteRecord = typeof notes.$inferSelect;

export type ApiProjectNote = {
  _id: string;
  title: string;
  content: string;
  projectId?: string;
  tags: string[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
};

function normalizeTitle(title: string | undefined, content: string) {
  const trimmed = title?.trim();
  if (trimmed) {
    return trimmed;
  }

  const heading = content
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find(Boolean);

  return heading || "Untitled Note";
}

function normalizeTags(tags: string[] | undefined) {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
}

function toApiProjectNote(note: ProjectNoteRecord): ApiProjectNote {
  return {
    _id: note.id,
    title: note.title,
    content: note.content,
    projectId: note.projectId ?? undefined,
    tags: note.tags ?? [],
    isPinned: note.isPinned,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

async function assertOwnedProjectNote(
  clerkUserId: string,
  projectId: string,
  noteId: string,
) {
  const { note } = await assertOwnedNote(clerkUserId, noteId);
  if (note.projectId !== projectId) {
    throw new NotFoundError("Note", noteId);
  }

  return {
    db: getPersistenceDb(),
    user: await ensureCurrentPersistenceUser(clerkUserId),
    note,
  };
}

async function assertOwnedNote(clerkUserId: string, noteId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, user.id)),
  });

  if (!note) {
    throw new NotFoundError("Note", noteId);
  }

  return { db, user, note };
}

export async function listProjectNotes(clerkUserId: string, projectId: string) {
  return listNotes(clerkUserId, { projectId });
}

export async function listNotes(
  clerkUserId: string,
  input: { projectId?: string | null } = {},
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const rows = await db.query.notes.findMany({
    where: and(
      eq(notes.userId, user.id),
      input.projectId === undefined
        ? undefined
        : input.projectId === null
          ? eq(notes.projectId, null as never)
          : eq(notes.projectId, input.projectId),
    ),
    orderBy: [desc(notes.updatedAt)],
  });

  return rows.map(toApiProjectNote);
}

export async function createProjectNote(
  clerkUserId: string,
  projectId: string,
  input: {
    title?: string;
    content?: string;
    tags?: string[];
    isPinned?: boolean;
  },
) {
  return createNote(clerkUserId, { ...input, projectId });
}

export async function createNote(
  clerkUserId: string,
  input: {
    title?: string;
    content?: string;
    tags?: string[];
    isPinned?: boolean;
    projectId?: string | null;
  },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const now = Date.now();
  const content = input.content ?? "";

  const [note] = await db
    .insert(notes)
    .values({
      userId: user.id,
      title: normalizeTitle(input.title, content),
      content,
      projectId: input.projectId ?? null,
      tags: normalizeTags(input.tags),
      isPinned: input.isPinned ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!note) {
    throw new Error("Failed to create note");
  }

  return toApiProjectNote(note);
}

export async function updateProjectNote(
  clerkUserId: string,
  projectId: string,
  noteId: string,
  input: {
    title?: string;
    content?: string;
    tags?: string[];
    isPinned?: boolean;
  },
) {
  await assertOwnedProjectNote(clerkUserId, projectId, noteId);
  return updateNote(clerkUserId, noteId, input);
}

export async function updateNote(
  clerkUserId: string,
  noteId: string,
  input: {
    title?: string;
    content?: string;
    tags?: string[];
    isPinned?: boolean;
  },
) {
  const { db, note } = await assertOwnedNote(clerkUserId, noteId);
  const nextContent = input.content ?? note.content;

  const [updated] = await db
    .update(notes)
    .set({
      title:
        input.title !== undefined || input.content !== undefined
          ? normalizeTitle(input.title ?? note.title, nextContent)
          : note.title,
      content: nextContent,
      tags: input.tags !== undefined ? normalizeTags(input.tags) : note.tags,
      isPinned: input.isPinned ?? note.isPinned,
      updatedAt: Date.now(),
    })
    .where(eq(notes.id, note.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update note");
  }

  return toApiProjectNote(updated);
}

export async function deleteProjectNote(
  clerkUserId: string,
  projectId: string,
  noteId: string,
) {
  await assertOwnedProjectNote(clerkUserId, projectId, noteId);
  return deleteNote(clerkUserId, noteId);
}

export async function deleteNote(clerkUserId: string, noteId: string) {
  const { db, note } = await assertOwnedNote(clerkUserId, noteId);
  await db.delete(notes).where(eq(notes.id, note.id));
  return { deleted: true, noteId: note.id };
}
