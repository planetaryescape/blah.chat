/**
 * BYOD Database Router
 *
 * Defines which tables live on which database:
 * - "main": Always on blah.chat's Convex instance (app operations)
 * - "user": On user's BYOD instance if configured, otherwise main (content)
 */

export type TableLocation = "main" | "user";

/**
 * Mapping of table names to their database location
 */
export const TABLE_LOCATIONS: Record<string, TableLocation> = {
  // ===== Main DB (app operations) =====
  // These always stay on blah.chat's Convex instance

  // User management
  users: "main",
  userPreferences: "main",
  userOnboarding: "main",
  userStats: "main",

  // App settings
  templates: "main",
  adminSettings: "main",
  feedback: "main",

  // Sharing & notifications
  shares: "main",
  notifications: "main",

  // Jobs & migrations
  migrations: "main",
  emailAlerts: "main",
  jobs: "main",

  // BYOD management (always on main)
  userDatabaseConfig: "main",
  byodMigrations: "main",

  // ===== User DB (content) =====
  // These move to user's instance when BYOD is enabled

  // Conversations & messages
  conversations: "user",
  conversationParticipants: "user",
  messages: "user",
  toolCalls: "user",
  sources: "user",
  attachments: "user",

  // Memory system
  memories: "user",

  // Files
  files: "user",
  fileChunks: "user",

  // Projects
  projects: "user",
  projectConversations: "user",
  projectNotes: "user",
  projectFiles: "user",

  // Notes & tasks
  notes: "user",
  bookmarks: "user",
  snippets: "user",
  tasks: "user",

  // Tags
  tags: "user",
  conversationTags: "user",
  noteTags: "user",
  taskTags: "user",

  // Usage & cache
  usageRecords: "user",
  ttsCache: "user",

  // Presentations
  presentations: "user",
  slides: "user",
  outlineItems: "user",
  designTemplates: "user",
  presentationSessions: "user",

  // Activity
  activityEvents: "user",
};

/**
 * Get the database location for a table
 */
export function getTableLocation(table: string): TableLocation {
  const location = TABLE_LOCATIONS[table];
  if (!location) {
    console.warn(`Unknown table: ${table}, defaulting to main`);
    return "main";
  }
  return location;
}

/**
 * Check if a table is on the user's database (when BYOD enabled)
 */
export function isUserTable(table: string): boolean {
  return getTableLocation(table) === "user";
}

/**
 * Check if a table is on the main database
 */
export function isMainTable(table: string): boolean {
  return getTableLocation(table) === "main";
}

/**
 * Get all tables that belong to a specific location
 */
export function getTablesForLocation(location: TableLocation): string[] {
  return Object.entries(TABLE_LOCATIONS)
    .filter(([_, loc]) => loc === location)
    .map(([table]) => table);
}

/**
 * Get all user tables (content tables)
 */
export function getUserTables(): string[] {
  return getTablesForLocation("user");
}

/**
 * Get all main tables (app operation tables)
 */
export function getMainTables(): string[] {
  return getTablesForLocation("main");
}
