import type { IdMap } from "../id-map";
import type { ConvexChatSuggestionsCache } from "../types";
import { ts } from "./utils";

export interface PgStarterSuggestionCacheRow {
  id: string;
  userId: string;
  suggestions: unknown;
  needsRefresh: boolean;
  generatedAt: number;
  source: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Transform Convex chatSuggestionsCache to PG starterSuggestionCaches.
 * Drops `fingerprint` and `expiresAt` (not in PG schema).
 */
export function transformStarterSuggestions(
  doc: ConvexChatSuggestionsCache,
  idMap: IdMap,
): PgStarterSuggestionCacheRow {
  return {
    id: idMap.get("starterSuggestionCaches", doc._id),
    userId: idMap.get("users", doc.userId),
    suggestions: doc.suggestions,
    needsRefresh: false,
    generatedAt: ts(doc.generatedAt),
    source: "cache",
    createdAt: ts(doc._creationTime),
    updatedAt: ts(doc.updatedAt),
  };
}
