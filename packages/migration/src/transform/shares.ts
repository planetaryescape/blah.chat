import type { IdMap } from "../id-map";
import type { ConvexShare } from "../types";
import { int, ts, tsOpt } from "./utils";

export interface PgShareRow {
  id: string;
  userId: string;
  conversationId: string;
  shareId: string;
  title: string;
  expiresAt: number | null;
  isPublic: boolean;
  isActive: boolean;
  password: string | null;
  anonymizeUsernames: boolean;
  viewCount: number;
  createdAt: number;
}

export function transformShare(doc: ConvexShare, idMap: IdMap): PgShareRow {
  return {
    id: idMap.get("shares", doc._id),
    userId: idMap.get("users", doc.userId),
    conversationId: idMap.get("conversations", doc.conversationId),
    shareId: doc.shareId,
    title: doc.title,
    expiresAt: tsOpt(doc.expiresAt),
    isPublic: doc.isPublic,
    isActive: doc.isActive,
    password: doc.password ?? null,
    anonymizeUsernames: doc.anonymizeUsernames ?? false,
    viewCount: int(doc.viewCount),
    createdAt: ts(doc.createdAt),
  };
}
