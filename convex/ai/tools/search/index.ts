/**
 * Search Tools Index
 *
 * Barrel export for all search tools.
 * These tools work with optional projectId filter:
 * - With projectId: Search only that project's resources
 * - Without projectId: Search ALL user's resources
 */

export { createQueryHistoryTool } from "./queryHistory";
export { createSearchAllTool } from "./searchAll";
export { createSearchFilesTool } from "./searchFiles";
export { createSearchNotesTool } from "./searchNotes";
export { createSearchTasksTool } from "./searchTasks";
