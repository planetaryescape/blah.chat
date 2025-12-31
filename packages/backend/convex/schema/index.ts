/**
 * Schema modules index
 * Re-exports all table definitions for use in main schema
 */

export { activityEventsTable } from "./activity";
export {
  adminSettingsTable,
  emailAlertsTable,
  feedbackTable,
  feedbackTagJunctionsTable,
  feedbackTagsTable,
} from "./admin";
export { bookmarksTable, snippetsTable } from "./bookmarks";
export { byodMigrationsTable, userDatabaseConfigTable } from "./byodConfig";
export { userApiKeysTable } from "./byok";
export { cachedBibleVersesTable } from "./cache";
export { canvasDocumentsTable, canvasHistoryTable } from "./canvas";
// BYOD-eligible tables (user content)
export {
  conversationParticipantsTable,
  conversationsTable,
  conversationTokenUsageTable,
} from "./conversations";
export {
  fileChunksTable,
  filesTable,
  knowledgeChunksTable,
  knowledgeSourcesTable,
} from "./files";
export { memoriesTable } from "./memories";
export {
  attachmentsTable,
  messagesTable,
  sourceMetadataTable,
  sourcesTable,
  toolCallsTable,
} from "./messages";
export { jobsTable, migrationsTable } from "./migrations";
export { notesTable } from "./notes";
export { notificationsTable } from "./notifications";
export {
  designTemplatesTable,
  outlineItemsTable,
  presentationSessionsTable,
  presentationsTable,
  slidesTable,
} from "./presentations";
export {
  projectConversationsTable,
  projectFilesTable,
  projectNotesTable,
  projectsTable,
} from "./projects";
export { scheduledPromptsTable, sharesTable } from "./shares";
export {
  bookmarkTagsTable,
  noteTagsTable,
  snippetTagsTable,
  tagsTable,
  taskTagsTable,
} from "./tags";
export { tasksTable } from "./tasks";
export { templatesTable, votesTable } from "./templates";
export { ttsCacheTable, usageRecordsTable } from "./usage";
// Main-only tables (platform operations)
export {
  dismissedHintsTable,
  userOnboardingTable,
  userPreferencesTable,
  userRankingsTable,
  userStatsTable,
  usersTable,
} from "./users";
