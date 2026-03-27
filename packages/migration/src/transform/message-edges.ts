import type { IdMap } from "../id-map";
import type { ConvexMessage } from "../types";
import { int, ts } from "./utils";

export interface PgMessageEdgeRow {
  parentMessageId: string;
  childMessageId: string;
  position: number;
  edgeType: string;
  createdAt: number;
}

/**
 * Extract message edges from a Convex message's parentMessageIds.
 *
 * Each parent produces one edge with position = array index.
 * Falls back to legacy single `parentMessageId` if `parentMessageIds` is absent.
 * Returns empty array for root messages (no parents).
 */
export function transformMessageEdges(
  doc: ConvexMessage,
  idMap: IdMap,
): PgMessageEdgeRow[] {
  const childId = idMap.get("messages", doc._id);

  // Use tree-based parentMessageIds first
  if (doc.parentMessageIds && doc.parentMessageIds.length > 0) {
    return doc.parentMessageIds.map((parentId, position) => ({
      parentMessageId: idMap.get("messages", parentId),
      childMessageId: childId,
      position: int(position),
      edgeType: "reply",
      createdAt: ts(doc.createdAt),
    }));
  }

  // Fallback: legacy single parentMessageId
  if (doc.parentMessageId) {
    return [
      {
        parentMessageId: idMap.get("messages", doc.parentMessageId),
        childMessageId: childId,
        position: 0,
        edgeType: "reply",
        createdAt: ts(doc.createdAt),
      },
    ];
  }

  // Root message — no edges
  return [];
}
