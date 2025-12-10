import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

// Constants matching extract.ts
const SIMILARITY_THRESHOLD = 0.85;

// Helper: Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Helper: Check if memory is duplicate using semantic similarity
async function isMemoryDuplicate(
  // biome-ignore lint/suspicious/noExplicitAny: Convex context types
  ctx: any,
  userId: string,
  newEmbedding: number[],
): Promise<{ isDuplicate: boolean; similarContent?: string }> {
  try {
    const similarMemories = await ctx.vectorSearch("memories", "by_embedding", {
      vector: newEmbedding,
      // biome-ignore lint/suspicious/noExplicitAny: Convex query filter types
      filter: (q: any) => q.eq("userId", userId),
      limit: 5,
    });

    for (const memory of similarMemories) {
      if (
        !memory.embedding ||
        memory.embedding.length !== newEmbedding.length
      ) {
        continue;
      }

      const similarity = cosineSimilarity(newEmbedding, memory.embedding);
      if (similarity > SIMILARITY_THRESHOLD) {
        // Return the similar content for user feedback
        const fullMemory = await ctx.runQuery(internal.memories.getMemoryById, {
          id: memory._id,
        });
        return {
          isDuplicate: true,
          similarContent: fullMemory?.content,
        };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error("Error checking duplicate:", error);
    return { isDuplicate: false };
  }
}

/**
 * Save a memory from LLM tool call.
 * Used when user explicitly asks to remember something or LLM identifies important info.
 */
export const saveFromTool = internalAction({
  args: {
    userId: v.id("users"),
    content: v.string(),
    category: v.string(),
    reasoning: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    message: string;
    memoryId?: Id<"memories">;
    duplicate?: boolean;
  }> => {
    try {
      // 1. Generate embedding for the content
      const embeddingResult = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: args.content,
      });

      // 2. Check for duplicates
      const duplicateCheck = await isMemoryDuplicate(
        ctx,
        args.userId,
        embeddingResult.embedding,
      );

      if (duplicateCheck.isDuplicate) {
        return {
          success: false,
          duplicate: true,
          message: `This information is already saved: "${duplicateCheck.similarContent?.slice(0, 100)}..."`,
        };
      }

      // 3. Store the memory with high importance (explicit save = important)
      const memoryId = await ctx.runMutation(internal.memories.create, {
        userId: args.userId,
        content: args.content,
        embedding: embeddingResult.embedding,
        metadata: {
          category: args.category,
          importance: 9, // Explicit saves are highly important
          reasoning: args.reasoning,
          confidence: 1.0, // Explicit save = 100% confident
          verifiedBy: "manual", // Treat tool-initiated as verified
          version: 1,
          expirationHint: "preference", // Default to never expire
          extractedAt: Date.now(),
        },
      });

      console.log(
        `[Memory] Saved via tool: "${args.content.slice(0, 50)}..." (${args.category})`,
      );

      return {
        success: true,
        message: `Saved to memory: "${args.content}"`,
        memoryId,
      };
    } catch (error) {
      console.error("[Memory] Tool save failed:", error);
      return {
        success: false,
        message: `Failed to save memory: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
