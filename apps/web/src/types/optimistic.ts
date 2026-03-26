/**
 * Optimistic message shown immediately when user sends message
 * Replaced by real server message when confirmed
 */
export interface OptimisticMessage {
  _id: string | `temp-${string}`; // Support both real IDs and temp IDs
  conversationId: string;
  userId?: string;
  role: "user" | "assistant";
  content: string;
  clientMessageId?: string;
  status: "optimistic" | "pending" | "generating" | "complete" | "error";
  model?: string;
  attachments?: Array<{
    id: string;
    type: "file" | "image" | "audio";
    name: string;
    mimeType: string;
    size: number;
    file?: File;
    preview?: string;
    url?: string;
    storageId: string;
    uploadStatus?: "pending" | "uploading" | "complete" | "error";
    _optimistic?: boolean;
  }>;
  comparisonGroupId?: string;
  createdAt: number;
  updatedAt: number;
  _creationTime: number; // Legacy system field - set to match server messages
  _optimistic: true;
  // Optional fields from real messages (for type compatibility)
  partialContent?: string;
  reasoning?: string;
  partialReasoning?: string;
  reasoningTokens?: number;
  thinkingStartedAt?: number;
  thinkingCompletedAt?: number;
  error?: string;
  parentMessageId?: string;
  consolidatedMessageId?: string;
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
  conversationId: string;
  content: string;
  modelId?: string;
  models?: string[];
  parentMessageId?: string;
  clientMessageId?: string;
  thinkingEffort?: "none" | "low" | "medium" | "high";
  attachments?: Array<{
    id: string;
    type: "file" | "image" | "audio";
    name: string;
    storageId: string;
    mimeType: string;
    size: number;
  }>;
  timestamp: number;
  retries: number;
}
