export type SourceType = "file" | "text" | "web" | "youtube";
export type SourceStatus = "pending" | "processing" | "completed" | "failed";

export interface KnowledgeSource {
  _id: string;
  title: string;
  type: SourceType;
  status: SourceStatus;
  description?: string;
  chunkCount?: number;
  url?: string;
  storageId?: string;
  mimeType?: string;
  size?: number;
  error?: string;
  createdAt: number;
  updatedAt?: number;
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

export interface ProjectAttachment {
  _id: string;
  messageId: string;
  conversationId: string;
  type: "file" | "image" | "audio";
  storageId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
}
