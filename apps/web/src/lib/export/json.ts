export interface ExportData {
  version: string;
  exportedAt: string;
  user: {
    userId: string;
  };
  conversations: Array<
    any & {
      messages: any[];
    }
  >;
  memories: any[];
  projects: any[];
  bookmarks: any[];
}

export function exportToJSON(data: {
  conversations: Array<any & { messages: any[] }>;
  memories: any[];
  projects: any[];
  bookmarks: any[];
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
