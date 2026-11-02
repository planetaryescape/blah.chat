/**
 * BYOD Database Router
 *
 * Routes tables to either main (blah.chat) or user (BYOD) database.
 * Uses BYOD_TABLES allowlist from @blah-chat/shared as source of truth.
 */
import { BYOD_TABLES, isBYODTable } from "@blah-chat/shared/byod";

export type TableLocation = "main" | "user";

/** Get database location for a table */
export function getTableLocation(table: string): TableLocation {
  return isBYODTable(table) ? "user" : "main";
}

/** Get all BYOD tables */
export function getUserTables(): string[] {
  return [...BYOD_TABLES];
}
