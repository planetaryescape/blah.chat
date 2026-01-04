/**
 * Token usage information for context limit tracking.
 */
export interface TokenUsage {
  totalTokens: number;
  systemTokens?: number;
  messagesTokens?: number;
  memoriesTokens?: number;
}
