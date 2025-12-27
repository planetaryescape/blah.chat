/**
 * Title Generation Prompts
 *
 * Used for generating titles for conversations and notes.
 * These are simple, focused prompts for fast title generation.
 */

/**
 * Prompt for generating conversation titles.
 * Used by: ai/generateTitle.ts, conversations/actions.ts
 */
export const CONVERSATION_TITLE_PROMPT = `Generate a 3-6 word title capturing the main topic of this conversation.

Rules:
- Focus on the core subject, not the request type
- Use natural language, avoid technical jargon unless central to the topic
- No quotes, periods, or special punctuation
- Title case (capitalize first letter of major words)

Return only the title text.`;

/**
 * Prompt for generating note titles.
 * Used by: notes/generateTitle.ts
 */
export const NOTE_TITLE_PROMPT = `Generate a 3-8 word title capturing the main topic or purpose of this note.

Rules:
- Focus on what the note is about, not how it's written
- Use natural language
- No quotes, periods, or markdown formatting
- Title case

Return only the title text.`;
