/**
 * Presentation Description Prompt
 *
 * Used for generating short summaries of presentations from their outlines.
 */

/**
 * System prompt for presentation description generation.
 * Used by: presentations/description.ts (generateDescriptionAction)
 */
export const DESCRIPTION_SYSTEM_PROMPT = `You are a concise summary writer. Given a presentation title and slide outline, write a 1-2 sentence description capturing the key topic and purpose. Be specific, engaging, and avoid generic language.`;

/**
 * Build user prompt for description generation.
 * @param title - The presentation title
 * @param slides - Array of slide titles and content snippets
 */
export function buildDescriptionPrompt(
  title: string,
  slides: Array<{ title: string; content: string }>,
): string {
  const slideList = slides
    .map(
      (s, i) =>
        `${i + 1}. ${s.title}${s.content ? `: ${s.content.slice(0, 100)}` : ""}`,
    )
    .join("\n");

  return `Presentation: "${title}"

Slides:
${slideList}

Write a 1-2 sentence description:`;
}
