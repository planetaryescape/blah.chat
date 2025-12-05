import type { Doc } from "../../../convex/_generated/dataModel";

export interface ExportData {
  version: string;
  exportedAt: string;
  user: {
    userId: string;
  };
  conversations: Array<
    Doc<"conversations"> & {
      messages: Doc<"messages">[];
    }
  >;
  memories: Doc<"memories">[];
  projects: Doc<"projects">[];
  bookmarks: Doc<"bookmarks">[];
}

export function exportToJSON(data: {
  conversations: Array<Doc<"conversations"> & { messages: Doc<"messages">[] }>;
  memories: Doc<"memories">[];
  projects: Doc<"projects">[];
  bookmarks: Doc<"bookmarks">[];
  userId: string;
}): ExportData {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    user: {
      userId: data.userId,
    },
    conversations: data.conversations,
    memories: data.memories,
    projects: data.projects,
    bookmarks: data.bookmarks,
  };
}

export function generateJSONFilename(): string {
  const timestamp = new Date().toISOString().split("T")[0];
  return `blah-chat-export-${timestamp}.json`;
}
