import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export const SIMILARITY_THRESHOLD = 0.85;

/**
 * Check if memory is duplicate using semantic similarity.
 * Uses native vector search with similarity scores.
 */
export async function isMemoryDuplicate(
  ctx: any,
  userId: string,
  newEmbedding: number[],
): Promise<{ isDuplicate: boolean; similarContent?: string }> {
  try {
    const similarMemories = await ctx.vectorSearch("memories", "by_embedding", {
      vector: newEmbedding,
      filter: (q: any) => q.eq("userId", userId),
      limit: 5,
    });

    for (const result of similarMemories) {
      const score = (result as any)._score as number;
      if (score > SIMILARITY_THRESHOLD) {
        // Fetch full memory for content
        const fullMemory = await ctx.runQuery(internal.memories.getMemoryById, {
          id: (result as any)._id as Id<"memories">,
        });
        return {
          isDuplicate: true,
          similarContent: fullMemory?.content,
        };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    const { logger } = await import("../logger");
    logger.error("Error checking duplicate", {
      tag: "Memory",
      userId,
      error: String(error),
    });
    return { isDuplicate: false };
  }
}
