/**
 * Memory Rephrasing Prompt
 *
 * Used for converting memories to third-person perspective.
 */

/**
 * Build prompt for rephrasing a single memory to third-person.
 * Used by: memories.ts (migrateUserMemories)
 *
 * @param memoryContent - The original memory content
 */
export function buildMemoryRephrasePrompt(memoryContent: string): string {
  return `Rephrase this memory to third-person perspective for AI context injection.

Original: "${memoryContent}"

Rephrasing rules:
- "I am X" → "User is X"
- "My wife is Jane" → "User's wife is named Jane"
- "I prefer X" → "User prefers X"
- "We're building X" → "User is building X"

Preserve specifics exactly:
- Technical terms: "Next.js 15", "gpt-4o", "React 19"
- Version numbers: "TypeScript 5.3"
- Project names: "blah.chat"
- Code snippets: \`const\` vs \`let\`

For quotes, attribute to user:
- "I say 'X'" → "User's motto: 'X'"

Return JSON: {"content": "rephrased memory text"}`;
}
