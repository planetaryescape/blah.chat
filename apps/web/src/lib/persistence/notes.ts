import { createHash } from "node:crypto";
import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { TAG_EXTRACTION_MODEL } from "@blah-chat/ai/operational-models";
import { getModel } from "@blah-chat/ai/registry";
import { calculateCost, type UsageTokenInfo } from "@blah-chat/ai/utils";
import {
  createTriggerClient,
  notes,
  parsePersistenceEnv,
  users,
} from "@blah-chat/persistence-postgres";
import { normalizeTagSlug } from "@blah-chat/shared/utils";
import { generateObject } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/api/errors";
import { buildAutoTagPrompt } from "@/lib/prompts/operational";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

type ProjectNoteRecord = typeof notes.$inferSelect;

const noteTagSchema = z.object({
  tags: z.array(z.string().min(2).max(30)).min(1).max(3),
});

export type ApiProjectNote = {
  _id: string;
  title: string;
  content: string;
  sourceMessageId?: string;
  sourceConversationId?: string;
  projectId?: string;
  tags: string[];
  suggestedTags: string[];
  isPinned: boolean;
  shareId?: string;
  isPublic: boolean;
  shareExpiresAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type PublicNoteShareMetadata = {
  _id: string;
  title: string;
  requiresPassword: boolean;
  expiresAt?: number;
  isOwner: boolean;
};

export type PublicNoteShare = {
  _id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isOwner: boolean;
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

function isShareExpired(note: ProjectNoteRecord) {
  return (
    typeof note.shareExpiresAt === "number" && note.shareExpiresAt < Date.now()
  );
}

function hashSharePassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function logAutoTagUsage(input: {
  noteId: string;
  userId: string;
  usage?: UsageTokenInfo | null;
}) {
  if (!input.usage) {
    return;
  }

  const inputTokens = input.usage.inputTokens ?? 0;
  const outputTokens = input.usage.outputTokens ?? 0;

  console.info("note auto-tag usage", {
    noteId: input.noteId,
    userId: input.userId,
    modelId: TAG_EXTRACTION_MODEL.id,
    inputTokens,
    outputTokens,
    cachedInputTokens: input.usage.cachedInputTokens ?? 0,
    reasoningTokens: input.usage.reasoningTokens ?? 0,
    costUsd: calculateCost(TAG_EXTRACTION_MODEL.id, {
      inputTokens,
      outputTokens,
    }),
  });
}

function toApiProjectNote(note: ProjectNoteRecord): ApiProjectNote {
  return {
    _id: note.id,
    title: note.title,
    content: note.content,
    sourceMessageId: note.sourceMessageId ?? undefined,
    sourceConversationId: note.sourceConversationId ?? undefined,
    projectId: note.projectId ?? undefined,
    tags: note.tags ?? [],
    suggestedTags: note.suggestedTags ?? [],
    isPinned: note.isPinned,
    shareId: note.shareId ?? undefined,
    isPublic: note.isPublic,
    shareExpiresAt: note.shareExpiresAt ?? undefined,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

async function getNoteOwner(note: ProjectNoteRecord) {
  return getPersistenceDb().query.users.findFirst({
    where: eq(users.id, note.userId),
  });
}

async function viewerOwnsNote(
  note: ProjectNoteRecord,
  viewerClerkUserId?: string,
): Promise<boolean> {
  if (!viewerClerkUserId) {
    return false;
  }

  const owner = await getNoteOwner(note);
  return owner?.clerkId === viewerClerkUserId;
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

async function getNoteByShareId(shareId: string) {
  return getPersistenceDb().query.notes.findFirst({
    where: eq(notes.shareId, shareId),
  });
}

async function listUserTagStats(userId: string) {
  const rows = await getPersistenceDb().query.notes.findMany({
    columns: {
      tags: true,
    },
    where: eq(notes.userId, userId),
  });

  const counts = new Map<string, { displayName: string; usageCount: number }>();

  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      const trimmed = tag.trim();
      if (!trimmed) {
        continue;
      }

      const slug = normalizeTagSlug(trimmed);
      const existing = counts.get(slug);
      if (existing) {
        existing.usageCount += 1;
        continue;
      }

      counts.set(slug, {
        displayName: trimmed,
        usageCount: 1,
      });
    }
  }

  return [...counts.values()].sort((left, right) => {
    return right.usageCount - left.usageCount;
  });
}

export async function listProjectNotes(clerkUserId: string, projectId: string) {
  return listNotes(clerkUserId, { projectId });
}

export async function getNote(clerkUserId: string, noteId: string) {
  const { note } = await assertOwnedNote(clerkUserId, noteId);
  return toApiProjectNote(note);
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
    sourceMessageId?: string | null;
    sourceConversationId?: string | null;
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
      sourceMessageId: input.sourceMessageId ?? null,
      sourceConversationId: input.sourceConversationId ?? null,
      tags: normalizeTags(input.tags),
      isPinned: input.isPinned ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!note) {
    throw new Error("Failed to create note");
  }

  // Fire-and-forget embedding generation
  const trigger = createTriggerClient(parsePersistenceEnv(process.env));
  trigger.triggerTask("embed-note", { noteId: note.id }).catch(() => {});

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
    suggestedTags?: string[];
    isPinned?: boolean;
    projectId?: string | null;
    shareId?: string | null;
    isPublic?: boolean;
    shareExpiresAt?: number | null;
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
      suggestedTags:
        input.suggestedTags !== undefined
          ? normalizeTags(input.suggestedTags)
          : note.suggestedTags,
      isPinned: input.isPinned ?? note.isPinned,
      projectId:
        input.projectId !== undefined ? input.projectId : note.projectId,
      shareId: input.shareId !== undefined ? input.shareId : note.shareId,
      isPublic: input.isPublic ?? note.isPublic,
      shareExpiresAt:
        input.shareExpiresAt !== undefined
          ? input.shareExpiresAt
          : note.shareExpiresAt,
      updatedAt: Date.now(),
    })
    .where(eq(notes.id, note.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update note");
  }

  // Re-embed on content/title change
  if (input.title !== undefined || input.content !== undefined) {
    const trigger = createTriggerClient(parsePersistenceEnv(process.env));
    trigger.triggerTask("embed-note", { noteId: updated.id }).catch(() => {});
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

export async function addNoteTag(
  clerkUserId: string,
  noteId: string,
  tag: string,
) {
  const { note } = await assertOwnedNote(clerkUserId, noteId);
  return updateNote(clerkUserId, noteId, {
    tags: Array.from(new Set([...(note.tags ?? []), tag])),
  });
}

export async function removeNoteTag(
  clerkUserId: string,
  noteId: string,
  tag: string,
) {
  const { note } = await assertOwnedNote(clerkUserId, noteId);
  return updateNote(clerkUserId, noteId, {
    tags: (note.tags ?? []).filter((existingTag) => existingTag !== tag),
  });
}

export async function triggerNoteAutoTag(
  clerkUserId: string,
  noteId: string,
): Promise<{ appliedTags: string[] }> {
  const { db, user, note } = await assertOwnedNote(clerkUserId, noteId);

  if (note.content.trim().length < 50) {
    return { appliedTags: [] };
  }

  const existingTags = await listUserTagStats(user.id);

  try {
    const result = await generateObject({
      model: getModel(TAG_EXTRACTION_MODEL.id),
      schema: noteTagSchema,
      temperature: 0.3,
      providerOptions: getGatewayOptions(TAG_EXTRACTION_MODEL.id, user.id, [
        "auto-tagging",
      ]),
      prompt: buildAutoTagPrompt(note.content.slice(0, 1000), existingTags),
    });

    const existingTagsBySlug = new Map(
      existingTags.map((tag) => [
        normalizeTagSlug(tag.displayName),
        tag.displayName,
      ]),
    );

    const appliedTags = Array.from(
      new Set(
        result.object.tags
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => {
            const slug = normalizeTagSlug(tag);
            return existingTagsBySlug.get(slug) ?? tag.toLowerCase();
          }),
      ),
    ).slice(0, 3);

    const nextTags = Array.from(
      new Set([...(note.tags ?? []), ...appliedTags]),
    );

    await db
      .update(notes)
      .set({
        tags: nextTags,
        updatedAt: Date.now(),
      })
      .where(eq(notes.id, note.id));

    logAutoTagUsage({
      noteId: note.id,
      userId: user.id,
      usage: result.usage,
    });

    return { appliedTags };
  } catch (error) {
    console.warn("note auto-tag failed", {
      noteId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { appliedTags: [] };
  }
}

export async function createNoteShare(
  clerkUserId: string,
  noteId: string,
  input: {
    password?: string;
    expiresIn?: number;
  },
) {
  const { db, note } = await assertOwnedNote(clerkUserId, noteId);
  const shareId = nanoid(10);
  const expiresAt =
    typeof input.expiresIn === "number"
      ? Date.now() + input.expiresIn * 24 * 60 * 60 * 1000
      : null;
  const hashedPassword = input.password
    ? hashSharePassword(input.password)
    : null;

  const [updated] = await db
    .update(notes)
    .set({
      shareId,
      isPublic: true,
      sharePassword: hashedPassword,
      shareExpiresAt: expiresAt,
      updatedAt: Date.now(),
    })
    .where(eq(notes.id, note.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to create note share");
  }

  return toApiProjectNote(updated);
}

export async function toggleNoteShare(
  clerkUserId: string,
  noteId: string,
  input: { isActive: boolean },
) {
  const { db, note } = await assertOwnedNote(clerkUserId, noteId);

  if (!note.shareId) {
    throw new BadRequestError("Note share does not exist");
  }

  const [updated] = await db
    .update(notes)
    .set({
      isPublic: input.isActive,
      updatedAt: Date.now(),
    })
    .where(eq(notes.id, note.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to toggle note share");
  }

  return toApiProjectNote(updated);
}

export async function getNoteShareMetadata(
  shareId: string,
  viewerClerkUserId?: string,
): Promise<PublicNoteShareMetadata | null> {
  const note = await getNoteByShareId(shareId);
  if (!note?.isPublic || isShareExpired(note)) {
    return null;
  }

  return {
    _id: note.id,
    title: note.title,
    requiresPassword: Boolean(note.sharePassword),
    expiresAt: note.shareExpiresAt ?? undefined,
    isOwner: await viewerOwnsNote(note, viewerClerkUserId),
  };
}

export async function verifyNoteShare(
  shareId: string,
  input: {
    password?: string;
    viewerClerkUserId?: string;
  } = {},
): Promise<PublicNoteShare> {
  const note = await getNoteByShareId(shareId);
  if (!note?.isPublic || isShareExpired(note)) {
    throw new NotFoundError("Note share", shareId);
  }

  if (note.sharePassword) {
    if (!input.password) {
      throw new ForbiddenError("Password required");
    }

    if (hashSharePassword(input.password) !== note.sharePassword) {
      throw new ForbiddenError("Invalid password");
    }
  }

  return {
    _id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    isOwner: await viewerOwnsNote(note, input.viewerClerkUserId),
  };
}
