/**
 * Auto-Tagging Prompt
 *
 * Used for automatically tagging notes with existing tag reuse priority.
 * Generates 1-3 tags based on content relevance.
 */

/**
 * Prompt for auto-tagging notes with existing tag priority.
 * Used by: notes/tags.ts (extractAndApplyTags action)
 *
 * @param content - The note content to tag (first 1000 chars)
 * @param existingTags - User's existing tags (top 20 by usage)
 */
export function buildAutoTagPrompt(
  content: string,
  existingTags: Array<{ displayName: string; usageCount: number }>,
): string {
  const tagsContext =
    existingTags.length > 0
      ? `EXISTING TAGS (prioritize reuse):
${existingTags.map((t) => `- ${t.displayName} (used ${t.usageCount}×)`).join("\n")}`
      : "No existing tags yet.";

  return `Auto-tag this note with 1-3 tags.

CRITICAL RULES:
1. STRONGLY prefer existing tags (reuse > create new)
2. Only create new tags if content doesn't fit existing ones
3. Use 1-3 tags based on relevance (not always 3)
4. Min confidence: 80% (skip uncertain tags)
5. Lowercase only, kebab-case for multi-word (e.g., "machine-learning")
6. Skip generic tags like "help", "code", "general", "note"

${tagsContext}

NOTE CONTENT:
${content}

Return JSON: {"tags": ["tag1", "tag2"]}`;
}
