import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";

/**
 * Optimistic message shown immediately when user sends message
 * Replaced by real server message when confirmed
 */
export interface OptimisticMessage {
  _id: Id<"messages"> | `temp-${string}`; // Support both real IDs and temp IDs
  conversationId: Id<"conversations">;
  userId?: Id<"users">;
  role: "user" | "assistant";
  content: string;
  status: "optimistic" | "pending" | "generating" | "complete" | "error";
  model?: string;
  attachments?: Array<{
    id: string;
    file?: File;
    preview?: string;
    storageId?: Id<"_storage">;
    uploadStatus?: "pending" | "uploading" | "complete" | "error";
    _optimistic?: boolean;
  }>;
  comparisonGroupId?: string;
  createdAt: number;
  updatedAt: number;
  _creationTime: number; // Convex system field - set to match server messages
  _optimistic: true;
  // Optional fields from real messages (for type compatibility)
  partialContent?: string;
  reasoning?: string;
  partialReasoning?: string;
  reasoningTokens?: number;
  thinkingStartedAt?: number;
  thinkingCompletedAt?: number;
  error?: string;
  parentMessageId?: Id<"messages">;
  consolidatedMessageId?: Id<"messages">;
  isConsolidation?: boolean;
  generationStartedAt?: number;
  generationCompletedAt?: number;
  firstTokenAt?: number;
  tokensPerSecond?: number;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}

/**
 * Failed message with error state + retry capability
 * Shown when send fails - allows inline retry
 */
export interface FailedMessage extends OptimisticMessage {
  _failed: true;
  error: string;
}

/**
 * Queued message for offline mode
 * Persisted in localStorage, sent when online
 */
export interface QueuedMessage {
  id: string;
  conversationId: Id<"conversations">;
  content: string;
  modelId?: string;
  models?: string[];
  attachments?: Array<{
    id: string;
    storageId: Id<"_storage">;
  }>;
  timestamp: number;
  retries: number;
}
