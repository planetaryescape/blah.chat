/**
 * Auto-Tagging Prompt
 *
 * Used for automatically tagging notes/tasks with existing tag reuse priority.
 * Generates 1-3 tags based on content relevance.
 */

/**
 * Prompt for auto-tagging with existing tag priority.
 * Used by: notes/tags.ts, tasks/tags.ts
 *
 * @param content - The content to tag (truncated to ~1000 chars)
 * @param existingTags - ALL user's existing tags (sorted by usage)
 */
export function buildAutoTagPrompt(
  content: string,
  existingTags: Array<{ displayName: string; usageCount: number }>,
): string {
  const tagsContext =
    existingTags.length > 0
      ? `YOUR EXISTING TAGS (${existingTags.length} total):
${existingTags.map((t) => `- ${t.displayName} (${t.usageCount}×)`).join("\n")}`
      : "No existing tags yet - create appropriate ones.";

  return `Auto-tag this content with 1-3 tags.

${tagsContext}

DECISION PROCESS:
1. First, check if ANY existing tag fits the content well
2. Prefer existing tags even if not a perfect match (80%+ fit = use it)
3. Only create a NEW tag when:
   - Content covers a genuinely new topic not in your tags
   - Existing tags would be misleading or too vague
   - The new tag would likely be reused for similar future content

EXAMPLES:
- Content about "React hooks" + existing "react" → Use "react" (subtopic fits parent)
- Content about "gardening tips" + no gardening tags → Create "gardening" (genuinely new)
- Content about "Python async/await" + existing "python" → Use "python"
- Content about "machine learning basics" + existing "ai" → Use "ai" (close enough)
- Content about "kubernetes deployment" + no k8s/devops tags → Create "kubernetes" (new domain)
- Content about "casting notes for film project" + existing "projects" → Create "projects/film/casting" (nested)

RULES:
- 1-3 tags based on relevance (not always 3)
- Lowercase, kebab-case for multi-word (e.g., "machine-learning")
- Skip generic: "help", "code", "general", "note", "misc", "other"
- Compound tags supported: use "/" for nesting (e.g., "projects/acting/cast", "work/meetings")
  - Creates folder-like hierarchy
  - Use when content fits a specific subcategory of an existing tag

CONTENT:
${content}

Return JSON: {"tags": ["tag1", "tag2"]}`;
}
