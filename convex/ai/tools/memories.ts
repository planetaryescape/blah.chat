import type { Id } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

/**
 * Search user's memory system for relevant context.
 * Extracted from tool definition for testability and reusability.
 */
export async function searchUserMemories(
  ctx: ActionCtx,
  params: {
    userId: Id<"users">;
    query: string;
    limit?: number;
    category?: string;
  },
) {
  try {
    // FIXME: Convex internal API references cause "excessively deep" type errors in AI SDK context
    // @ts-ignore
    const results = await ctx.runAction(internal.memories.search.hybridSearch, {
      userId: params.userId,
      query: params.query,
      limit: params.limit ?? 5,
      category: params.category,
    });

    // Format for LLM consumption
    if (results.length === 0) {
      return {
        success: false,
        message: "No relevant memories found for this query.",
      };
    }

    return {
      success: true,
      count: results.length,
      memories: results.map((m: any) => ({
        content: m.content,
        category: m.metadata?.category || "other",
        importance: m.metadata?.importance || 0,
        relevanceScore: m.score?.toFixed(3),
      })),
    };
  } catch (error) {
    console.error("Memory tool execution failed:", error);
    return {
      success: false,
      message: "Failed to search memories. Please try again.",
    };
  }
}
