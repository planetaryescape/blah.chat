import { defineSchema } from "convex/server";
import { activityTable } from "./activity";
import { bookmarksTable } from "./bookmarks";
import { conversationsTable } from "./conversations";
import { filesTable } from "./files";
import { memoriesTable } from "./memories";
import { messagesTable } from "./messages";
import { notesTable } from "./notes";
import { presentationsTable } from "./presentations";
import { projectsTable } from "./projects";
import { tagsTable } from "./tags";
import { tasksTable } from "./tasks";
import { usageTable } from "./usage";

export const byodSchema = defineSchema({
  // Core content
  ...conversationsTable,
  ...messagesTable,
  ...memoriesTable,

  // Files
  ...filesTable,

  // Organization
  ...projectsTable,
  ...notesTable,
  ...tasksTable,
  ...bookmarksTable,
  ...tagsTable,

  // Usage tracking
  ...usageTable,

  // Presentations
  ...presentationsTable,

  // Activity
  ...activityTable,
});

// Re-export all table definitions for individual access
export { activityTable } from "./activity";
export { bookmarksTable } from "./bookmarks";
export { conversationsTable } from "./conversations";
export { filesTable } from "./files";
export { memoriesTable } from "./memories";
export { messagesTable } from "./messages";
export { notesTable } from "./notes";
export { presentationsTable } from "./presentations";
export { projectsTable } from "./projects";
export { tagsTable } from "./tags";
export { tasksTable } from "./tasks";
export { usageTable } from "./usage";

export default byodSchema;
