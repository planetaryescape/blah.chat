import type { IdMap } from "../id-map";
import type { ConvexBookmark } from "../types";
import { ts } from "./utils";

export interface PgBookmarkRow {
  id: string;
  userId: string;
  messageId: string;
  conversationId: string;
  note: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export function transformBookmark(
  doc: ConvexBookmark,
  idMap: IdMap,
): PgBookmarkRow {
  return {
    id: idMap.get("bookmarks", doc._id),
    userId: idMap.get("users", doc.userId),
    messageId: idMap.get("messages", doc.messageId),
    conversationId: idMap.get("conversations", doc.conversationId),
    note: doc.note ?? null,
    tags: doc.tags ?? [],
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.createdAt), // Convex bookmarks have no updatedAt
  };
}
