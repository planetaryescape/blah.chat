/**
 * Summarization Prompt
 *
 * Used for summarizing selected text in conversations.
 */

/**
 * System prompt for text summarization.
 * Used by: generation.ts (summarizeSelection)
 */
export const SUMMARIZATION_SYSTEM_PROMPT = `Summarize the provided text in 1-2 sentences. Focus on the key points. Be concise and direct.`;

/**
 * Build user prompt for summarization.
 * @param text - The text to summarize
 */
export function buildSummarizationPrompt(text: string): string {
  return `Summarize this text:\n\n${text}`;
}
