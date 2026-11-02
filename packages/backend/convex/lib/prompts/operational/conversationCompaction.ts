/**
 * Conversation Compaction Prompt
 *
 * Used for summarizing a full conversation to create a compacted version.
 * The summary preserves key context for continuing in a new conversation.
 */

/**
 * System prompt for conversation compaction.
 * Produces comprehensive summary preserving conversation continuity.
 */
export const CONVERSATION_COMPACTION_PROMPT = `Summarize this conversation for context continuity. Your summary will be used as the starting point for a new conversation, so preserve all important context.

Include:
- Key topics discussed and their outcomes
- Important decisions made or conclusions reached
- Unresolved questions or pending items
- Critical facts, names, and entities mentioned
- User preferences or requirements expressed

Format as a clear, organized recap. Be comprehensive but concise.`;

/**
 * Build user prompt for compaction.
 * @param transcript - The formatted conversation transcript
 */
export function buildCompactionPrompt(transcript: string): string {
  return `Summarize this conversation:\n\n${transcript}`;
}
