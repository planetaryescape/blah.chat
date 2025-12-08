/**
 * Tag Extraction Prompt
 *
 * Used for extracting tags from note content.
 * Simple, focused prompt for fast tag extraction.
 */

/**
 * Prompt for extracting tags from notes.
 * Used by: notes/tags.ts
 *
 * @param content - The note content to extract tags from (first 1000 chars)
 */
export function buildTagExtractionPrompt(content: string): string {
  return `Extract 3-5 concise tags from this note content.

Rules:
- Lowercase only
- 1-2 words max per tag
- Use kebab-case for multi-word tags (e.g., "api-design")
- Focus on topics, technologies, or key concepts
- Skip generic tags like "help", "code", "general", "note"

Content:
${content}

Return JSON: {"tags": ["tag1", "tag2", ...]}`;
}
