import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";

export type SourceType = "file" | "text" | "web" | "youtube";
export type SourceStatus = "pending" | "processing" | "completed" | "failed";

export interface KnowledgeSource {
  _id: Id<"knowledgeSources">;
  title: string;
  type: SourceType;
  status: SourceStatus;
  chunkCount?: number;
  url?: string;
  error?: string;
  createdAt: number;
}

export interface KnowledgeChunk {
  _id: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  pageNumber?: number;
  startTime?: string;
  endTime?: string;
}
