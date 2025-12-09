/**
 * Memory Reranking Prompt
 *
 * Used to reorder memory search results by relevance to the user's query.
 * Returns comma-separated indices in order of relevance.
 */

/**
 * Build the memory reranking prompt.
 * @param query - The user's search query
 * @param memories - Memory contents to rank (array of strings or objects with content)
 * @returns The formatted prompt for the LLM
 */
export function buildMemoryRerankPrompt(
  query: string,
  memories: { content: string }[],
): string {
  const memoriesList = memories
    .map((m, i) => `${i}. ${m.content}`)
    .join("\n");

  return `Rerank these memories by relevance to query: "${query}"

Memories:
${memoriesList}

Return ONLY comma-separated indices in relevance order (most relevant first).
Example: 3,0,5,1,2

Response:`;
}
