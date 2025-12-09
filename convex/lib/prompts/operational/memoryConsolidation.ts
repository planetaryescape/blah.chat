/**
 * Memory Consolidation Prompts
 *
 * Used for consolidating and deduplicating memories.
 */

export interface MemoryForConsolidation {
  _id: string;
  content: string;
  metadata?: {
    category?: string;
    importance?: number;
    reasoning?: string;
  };
}

/**
 * Build prompt for rephrasing a single memory (during consolidation).
 * Used when a "cluster" is just one memory that needs rephrasing.
 *
 * @param memory - The single memory to rephrase
 */
export function buildSingleMemoryConsolidationPrompt(
  memory: MemoryForConsolidation,
): string {
  const hasReasoning = !!memory.metadata?.reasoning;

  return `Rephrase this memory to third-person perspective for AI context injection.

Memory:
- ${memory.content} (ID: ${memory._id})

Rephrasing rules:
- "I am X" → "User is X"
- "My wife is Jane" → "User's wife is named Jane"
- "I prefer X" → "User prefers X"
- "We're building X" → "User is building X"

Preserve specifics exactly:
- Technical terms: "Next.js 15", "gpt-4o", "React 19"
- Version numbers: "TypeScript 5.3"
- Project names: "blah.chat"

${
  hasReasoning
    ? `Original reasoning (preserve exactly): "${memory.metadata!.reasoning}"`
    : `Generate a clear 1-2 sentence explanation of why this fact matters for future interactions.`
}

Return JSON: {"memories": [{"content": "rephrased text", "category": "${memory.metadata?.category || "context"}", "importance": ${memory.metadata?.importance || 7}, "sourceIds": ["${memory._id}"], "operation": "keep", "reasoning": "${hasReasoning ? "preserved reasoning" : "newly generated reasoning"}"}]}`;
}

/**
 * Build prompt for consolidating multiple similar memories.
 * Used when a cluster has 2+ memories to merge.
 *
 * @param cluster - Array of similar memories to consolidate
 */
export function buildClusterConsolidationPrompt(
  cluster: MemoryForConsolidation[],
): string {
  const memoriesList = cluster
    .map((m) => `- ${m.content} (ID: ${m._id})`)
    .join("\n");

  const reasoningStatus = cluster
    .map((m) => {
      if (m.metadata?.reasoning) {
        return `- [${m._id}]: HAS reasoning: "${m.metadata.reasoning}"`;
      }
      return `- [${m._id}]: NO reasoning. Content: "${m.content}"`;
    })
    .join("\n");

  return `Consolidate these related memories into atomic, self-contained units.

Memories:
${memoriesList}

Rules:
1. Each output memory = ONE thought/idea/fact
2. Remove exact duplicates (keep most complete)
3. Merge similar memories into unified statement
4. Preserve all unique information
5. Third-person format ("User is X", "User's Y")
6. Include context for clarity

Source memories with reasoning status:
${reasoningStatus}

Return JSON: {"memories": [{"content": "consolidated text", "category": "identity|preference|project|context|relationship", "importance": 1-10, "sourceIds": ["original IDs merged"], "operation": "merge|dedupe|keep", "reasoning": "combined reasoning or newly generated explanation"}]}

For reasoning: if source memories have reasoning, combine them. If not, generate clear 1-2 sentence explanation of why this fact is valuable.`;
}
