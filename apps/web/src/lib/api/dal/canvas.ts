import "server-only";
import {
  type DocumentRevisionSource,
  documentRevisions,
  documents,
} from "@blah-chat/persistence-postgres";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(""),
  documentType: z.enum(["code", "prose"]).default("prose"),
  language: z.string().optional(),
  conversationId: z.string().optional(),
});

const documentRevisionSourceSchema = z.enum([
  "user_edit",
  "ai_edit",
  "conflict_resolution",
  "restore",
]);

export const updateDocumentSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
    language: z.string().optional(),
    /** Optimistic concurrency: server rejects if doc.version != expectedVersion. */
    expectedVersion: z.number().int().min(0).optional(),
    source: documentRevisionSourceSchema.default("user_edit"),
    diffSummary: z.string().max(2000).optional(),
    messageId: z.string().optional(),
  })
  .partial();

function toApiDocument(row: typeof documents.$inferSelect) {
  return {
    _id: row.id,
    userId: row.userId,
    conversationId: row.conversationId ?? undefined,
    title: row.title,
    content: row.content,
    documentType: row.documentType as "code" | "prose",
    language: row.language ?? undefined,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toApiRevision(row: typeof documentRevisions.$inferSelect) {
  return {
    _id: row.id,
    documentId: row.documentId,
    userId: row.userId,
    version: row.version,
    content: row.content,
    diffSummary: row.diffSummary ?? undefined,
    source: row.source as DocumentRevisionSource,
    messageId: row.messageId ?? undefined,
    createdAt: row.createdAt,
  };
}

/**
 * Thrown when a PATCH supplies expectedVersion that doesn't match current
 * `documents.version`. Route handler maps to HTTP 409 with currentVersion
 * and currentContent so the client can surface ConflictDialog.
 */
export class DocumentVersionConflictError extends Error {
  readonly currentVersion: number;
  readonly currentContent: string;
  constructor(currentVersion: number, currentContent: string) {
    super("Document version conflict");
    this.name = "DocumentVersionConflictError";
    this.currentVersion = currentVersion;
    this.currentContent = currentContent;
  }
}

export const canvasDAL = {
  list: async (clerkUserId: string, conversationId?: string) => {
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(clerkUserId);
    const where = conversationId
      ? and(
          eq(documents.userId, user.id),
          eq(documents.conversationId, conversationId),
        )
      : eq(documents.userId, user.id);

    const rows = await db
      .select()
      .from(documents)
      .where(where)
      .orderBy(desc(documents.updatedAt));

    return formatEntityList(rows.map(toApiDocument), "document");
  },

  get: async (clerkUserId: string, documentId: string) => {
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(clerkUserId);

    const row = await db.query.documents.findFirst({
      where: and(eq(documents.id, documentId), eq(documents.userId, user.id)),
    });

    if (!row) {
      throw new Error("Document not found");
    }

    return formatEntity(toApiDocument(row), "document", row.id);
  },

  create: async (
    clerkUserId: string,
    payload: z.input<typeof createDocumentSchema>,
  ) => {
    const validated = createDocumentSchema.parse(payload);
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(clerkUserId);

    const [row] = await db
      .insert(documents)
      .values({
        userId: user.id,
        conversationId: validated.conversationId,
        title: validated.title,
        content: validated.content,
        documentType: validated.documentType,
        language: validated.language,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create document");
    }

    // Record initial revision so history is non-empty from creation.
    await db.insert(documentRevisions).values({
      documentId: row.id,
      userId: user.id,
      version: row.version,
      content: row.content,
      source: "user_edit",
      diffSummary: "Created",
      createdAt: Date.now(),
    });

    return formatEntity(toApiDocument(row), "document", row.id);
  },

  update: async (
    clerkUserId: string,
    documentId: string,
    payload: z.input<typeof updateDocumentSchema>,
  ) => {
    const validated = updateDocumentSchema.parse(payload);
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(clerkUserId);

    // Use a transaction with an advisory lock keyed on the document id so
    // concurrent writers (interactive panel + AI streaming) serialize per
    // document. PGlite is single-process so the lock is effectively a no-op
    // in tests; on real Postgres it prevents lost updates.
    return await db.transaction(async (tx) => {
      // pg_advisory_xact_lock is best-effort — skip on engines that lack it
      // (PGlite throws). The catch is intentional: PGlite tests still get
      // serializable correctness via single-threaded execution.
      try {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${documentId}))`,
        );
      } catch {
        // PGlite or other engine without advisory locks; continue without it.
      }

      const existing = await tx.query.documents.findFirst({
        where: and(eq(documents.id, documentId), eq(documents.userId, user.id)),
      });
      if (!existing) {
        throw new Error("Document not found");
      }

      if (
        validated.expectedVersion !== undefined &&
        existing.version !== validated.expectedVersion
      ) {
        throw new DocumentVersionConflictError(
          existing.version,
          existing.content,
        );
      }

      const nextVersion = existing.version + 1;
      const nextContent =
        validated.content !== undefined ? validated.content : existing.content;

      const [row] = await tx
        .update(documents)
        .set({
          ...(validated.title !== undefined ? { title: validated.title } : {}),
          ...(validated.content !== undefined
            ? { content: validated.content }
            : {}),
          ...(validated.language !== undefined
            ? { language: validated.language }
            : {}),
          version: nextVersion,
          updatedAt: Date.now(),
        })
        .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
        .returning();

      if (!row) {
        throw new Error("Failed to update document");
      }

      // Append revision only when content actually changed. Title-only edits
      // skip history to keep the timeline focused on the artifact body.
      if (validated.content !== undefined) {
        await tx.insert(documentRevisions).values({
          documentId: row.id,
          userId: user.id,
          version: nextVersion,
          content: nextContent,
          source: validated.source ?? "user_edit",
          diffSummary: validated.diffSummary,
          messageId: validated.messageId,
          createdAt: Date.now(),
        });
      }

      return formatEntity(toApiDocument(row), "document", row.id);
    });
  },

  delete: async (clerkUserId: string, documentId: string) => {
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(clerkUserId);

    const result = await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
      .returning();

    if (result.length === 0) {
      throw new Error("Document not found");
    }

    return formatEntity({ deleted: true }, "document", documentId);
  },

  listHistory: async (
    clerkUserId: string,
    documentId: string,
    opts?: { limit?: number; order?: "asc" | "desc" },
  ) => {
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(clerkUserId);

    // Ownership guard via documents row first.
    const owned = await db.query.documents.findFirst({
      where: and(eq(documents.id, documentId), eq(documents.userId, user.id)),
    });
    if (!owned) {
      throw new Error("Document not found");
    }

    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    const orderFn = opts?.order === "asc" ? asc : desc;
    const rows = await db
      .select()
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, documentId))
      .orderBy(orderFn(documentRevisions.version))
      .limit(limit);

    return formatEntityList(rows.map(toApiRevision), "document_revision");
  },

  restore: async (
    clerkUserId: string,
    documentId: string,
    revisionId: string,
  ) => {
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(clerkUserId);

    return await db.transaction(async (tx) => {
      try {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${documentId}))`,
        );
      } catch {}

      const target = await tx.query.documentRevisions.findFirst({
        where: and(
          eq(documentRevisions.id, revisionId),
          eq(documentRevisions.documentId, documentId),
          eq(documentRevisions.userId, user.id),
        ),
      });
      if (!target) {
        throw new Error("Revision not found");
      }

      const existing = await tx.query.documents.findFirst({
        where: and(eq(documents.id, documentId), eq(documents.userId, user.id)),
      });
      if (!existing) {
        throw new Error("Document not found");
      }

      const nextVersion = existing.version + 1;
      const [row] = await tx
        .update(documents)
        .set({
          content: target.content,
          version: nextVersion,
          updatedAt: Date.now(),
        })
        .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
        .returning();

      if (!row) {
        throw new Error("Failed to restore document");
      }

      // Restoration is itself a new revision — never destructive.
      await tx.insert(documentRevisions).values({
        documentId: row.id,
        userId: user.id,
        version: nextVersion,
        content: target.content,
        source: "restore",
        diffSummary: `Restored from v${target.version}`,
        createdAt: Date.now(),
      });

      return formatEntity(toApiDocument(row), "document", row.id);
    });
  },
};
