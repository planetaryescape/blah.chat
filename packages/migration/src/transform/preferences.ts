import type { IdMap } from "../id-map";
import type { ConvexUserPreference } from "../types";
import { ts } from "./utils";

export interface PgUserPreferenceRow {
  userId: string;
  key: string;
  value: unknown;
  createdAt: number;
  updatedAt: number;
}

/**
 * Transform Convex userPreference to PG row.
 * PG uses composite PK (userId, key) — no `id` column.
 * Drops Convex `category` field (not in PG schema).
 */
export function transformPreference(
  doc: ConvexUserPreference,
  idMap: IdMap,
): PgUserPreferenceRow {
  return {
    userId: idMap.get("users", doc.userId),
    key: doc.key,
    value: doc.value,
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}
