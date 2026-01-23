/**
 * BYOD Tables Allowlist
 *
 * Tables included in BYOD user deployments.
 * This list is the single source of truth for:
 * - BYOD schema generation (which tables to include)
 * - Router (where to route queries for BYOD users)
 *
 * Tables NOT in this list remain on the main database only.
 */
export const BYOD_TABLES = [
  // Conversations
  "conversations",
  "conversationParticipants",
  "conversationTokenUsage",

  // Messages
  "messages",
  "attachments",
  "toolCalls",
  "sourceMetadata",
  "sources",

  // Memories
  "memories",

  // Files
  "files",
  "fileChunks",
  "knowledgeSources",
  "knowledgeChunks",

  // Projects
  "projects",
  "projectConversations",
  "projectNotes",
  "projectFiles",

  // Tasks
  "tasks",

  // Notes
  "notes",

  // Bookmarks & Snippets
  "bookmarks",
  "snippets",

  // Tags
  "tags",
  "bookmarkTags",
  "snippetTags",
  "noteTags",
  "taskTags",

  // Shares & Scheduling
  "shares",
  "scheduledPrompts",

  // Usage & Cache
  "usageRecords",
  "ttsCache",

  // Templates & Votes
  "templates",
  "votes",

  // Activity
  "activityEvents",

  // Canvas
  "canvasDocuments",
  "canvasHistory",

  // Notifications
  "notifications",
] as const;

export type BYODTable = (typeof BYOD_TABLES)[number];

/**
 * Check if a table is included in BYOD schema
 */
export function isBYODTable(table: string): table is BYODTable {
  return BYOD_TABLES.includes(table as BYODTable);
}
