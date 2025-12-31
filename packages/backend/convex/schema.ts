/**
 * Main Convex Schema
 * Composed from modular table definitions in ./schema/
 *
 * Tables are organized into:
 * - BYOD-eligible: User content stored on user's own DB when using BYOD
 * - Main-only: Platform operations stored only on main DB
 */
import { defineSchema } from "convex/server";
import { activityEventsTable } from "./schema/activity";
import {
  adminSettingsTable,
  emailAlertsTable,
  feedbackTable,
  feedbackTagJunctionsTable,
  feedbackTagsTable,
} from "./schema/admin";
import { bookmarksTable, snippetsTable } from "./schema/bookmarks";
import {
  byodMigrationsTable,
  userDatabaseConfigTable,
} from "./schema/byod-config";
import { userApiKeysTable } from "./schema/byok";
import { cachedBibleVersesTable } from "./schema/cache";
import { canvasDocumentsTable, canvasHistoryTable } from "./schema/canvas";
// BYOD-eligible tables (user content)
import {
  conversationParticipantsTable,
  conversationsTable,
  conversationTokenUsageTable,
} from "./schema/conversations";
import {
  fileChunksTable,
  filesTable,
  knowledgeChunksTable,
  knowledgeSourcesTable,
} from "./schema/files";
import { memoriesTable } from "./schema/memories";
import {
  attachmentsTable,
  messagesTable,
  sourceMetadataTable,
  sourcesTable,
  toolCallsTable,
} from "./schema/messages";
import { jobsTable, migrationsTable } from "./schema/migrations";
import { notesTable } from "./schema/notes";
import { notificationsTable } from "./schema/notifications";
import {
  designTemplatesTable,
  outlineItemsTable,
  presentationSessionsTable,
  presentationsTable,
  slidesTable,
} from "./schema/presentations";
import {
  projectConversationsTable,
  projectFilesTable,
  projectNotesTable,
  projectsTable,
} from "./schema/projects";
import { scheduledPromptsTable, sharesTable } from "./schema/shares";
import {
  bookmarkTagsTable,
  noteTagsTable,
  snippetTagsTable,
  tagsTable,
  taskTagsTable,
} from "./schema/tags";
import { tasksTable } from "./schema/tasks";
import { templatesTable, votesTable } from "./schema/templates";
import { ttsCacheTable, usageRecordsTable } from "./schema/usage";
// Main-only tables (platform operations)
import {
  dismissedHintsTable,
  userOnboardingTable,
  userPreferencesTable,
  userRankingsTable,
  userStatsTable,
  usersTable,
} from "./schema/users";

export default defineSchema({
  // ===== BYOD-ELIGIBLE TABLES =====
  // User content - stored on user's own DB when using BYOD

  // Conversations
  conversations: conversationsTable,
  conversationParticipants: conversationParticipantsTable,
  conversationTokenUsage: conversationTokenUsageTable,

  // Messages
  messages: messagesTable,
  attachments: attachmentsTable,
  toolCalls: toolCallsTable,
  sourceMetadata: sourceMetadataTable,
  sources: sourcesTable,

  // Memories
  memories: memoriesTable,

  // Files
  files: filesTable,
  fileChunks: fileChunksTable,
  knowledgeSources: knowledgeSourcesTable,
  knowledgeChunks: knowledgeChunksTable,

  // Projects
  projects: projectsTable,
  projectConversations: projectConversationsTable,
  projectNotes: projectNotesTable,
  projectFiles: projectFilesTable,

  // Tasks
  tasks: tasksTable,

  // Notes
  notes: notesTable,

  // Bookmarks & Snippets
  bookmarks: bookmarksTable,
  snippets: snippetsTable,

  // Tags
  tags: tagsTable,
  bookmarkTags: bookmarkTagsTable,
  snippetTags: snippetTagsTable,
  noteTags: noteTagsTable,
  taskTags: taskTagsTable,

  // Shares & Scheduling
  shares: sharesTable,
  scheduledPrompts: scheduledPromptsTable,

  // Usage & Cache
  usageRecords: usageRecordsTable,
  ttsCache: ttsCacheTable,

  // Templates & Votes
  templates: templatesTable,
  votes: votesTable,

  // Presentations (Slides feature)
  presentations: presentationsTable,
  slides: slidesTable,
  outlineItems: outlineItemsTable,
  designTemplates: designTemplatesTable,
  presentationSessions: presentationSessionsTable,

  // Activity
  activityEvents: activityEventsTable,

  // Canvas
  canvasDocuments: canvasDocumentsTable,
  canvasHistory: canvasHistoryTable,

  // Notifications
  notifications: notificationsTable,

  // ===== MAIN-ONLY TABLES =====
  // Platform operations - never stored on user's BYOD instance

  // Users & Preferences
  users: usersTable,
  userPreferences: userPreferencesTable,
  userOnboarding: userOnboardingTable,
  dismissedHints: dismissedHintsTable,
  userStats: userStatsTable,
  userRankings: userRankingsTable,

  // Admin
  adminSettings: adminSettingsTable,
  emailAlerts: emailAlertsTable,
  feedback: feedbackTable,
  feedbackTags: feedbackTagsTable,
  feedbackTagJunctions: feedbackTagJunctionsTable,

  // Migrations & Jobs
  migrations: migrationsTable,
  jobs: jobsTable,

  // BYOD Config
  userDatabaseConfig: userDatabaseConfigTable,
  byodMigrations: byodMigrationsTable,

  // Cache
  cachedBibleVerses: cachedBibleVersesTable,

  // BYOK
  userApiKeys: userApiKeysTable,
});
