import type { IdMap } from "../id-map";
import type { ConvexNote } from "../types";
import { ts, tsOpt } from "./utils";

export interface PgNoteRow {
  id: string;
  userId: string;
  title: string;
  content: string;
  sourceMessageId: string | null;
  sourceConversationId: string | null;
  projectId: string | null;
  tags: string[];
  suggestedTags: string[];
  isPinned: boolean;
  shareId: string | null;
  isPublic: boolean;
  sharePassword: string | null;
  shareExpiresAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface PgNoteEmbeddingRow {
  id: string;
  userId: string;
  noteKey: string;
  content: string;
  embedding: string;
  searchDocument: string | null;
  metadata: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface NoteTransformResult {
  note: PgNoteRow;
  embedding?: PgNoteEmbeddingRow;
}

export function transformNote(
  doc: ConvexNote,
  idMap: IdMap,
): NoteTransformResult {
  const noteId = idMap.get("notes", doc._id);
  const note: PgNoteRow = {
    id: noteId,
    userId: idMap.get("users", doc.userId),
    title: doc.title,
    content: doc.content,
    sourceMessageId: idMap.getOptional("messages", doc.sourceMessageId) ?? null,
    sourceConversationId:
      idMap.getOptional("conversations", doc.sourceConversationId) ?? null,
    projectId: idMap.getOptional("projects", doc.projectId) ?? null,
    tags: doc.tags ?? [],
    suggestedTags: doc.suggestedTags ?? [],
    isPinned: doc.isPinned,
    shareId: doc.shareId ?? null,
    isPublic: doc.isPublic ?? false,
    sharePassword: doc.sharePassword ?? null,
    shareExpiresAt: tsOpt(doc.shareExpiresAt),
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };

  const result: NoteTransformResult = { note };

  if (doc.embedding && doc.embedding.length > 0) {
    result.embedding = {
      id: idMap.get("noteEmbeddings", `${doc._id}_emb`),
      userId: idMap.get("users", doc.userId),
      noteKey: noteId,
      content: doc.content,
      embedding: `[${doc.embedding.join(",")}]`,
      searchDocument: null,
      metadata: null,
      createdAt: ts(doc.createdAt),
      updatedAt: ts(doc.updatedAt),
    };
  }

  return result;
}
