import { embed } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "@/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

/**
 * Memory deletion from AI tool
 * Supports three modes: ID, semantic, category
 * Implements hybrid deletion: single = auto-delete, multiple = preview
 */
export const deleteFromTool = internalAction({
  args: {
    userId: v.id("users"),
    mode: v.union(
      v.literal("id"),
      v.literal("semantic"),
      v.literal("category"),
    ),
    value: v.string(),
    reasoning: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Find matching memories based on mode
      let matches: Doc<"memories">[] = [];

      if (args.mode === "id") {
        // Mode 1: Delete by exact ID
        try {
          const memory = await (
            ctx.runQuery as (
              ref: any,
              args: any,
            ) => Promise<Doc<"memories"> | null>
          )(internal.lib.helpers.getMemoryById, {
            id: args.value as Id<"memories">,
          });
          // Verify ownership
          if (memory && memory.userId === args.userId) {
            matches = [memory];
          }
        } catch (error) {
          console.error("Error fetching memory by ID:", error);
          return {
            success: false,
            message: `Memory with ID "${args.value}" not found`,
          };
        }
      } else if (args.mode === "semantic") {
        // Mode 2: Semantic search using vector similarity
        try {
          // Generate embedding for the query
          const embeddingResult = await embed({
            model: EMBEDDING_MODEL,
            value: args.value,
          });

          // Vector search for similar memories
          const vectorResults = await ctx.vectorSearch(
            "memories",
            "by_embedding",
            {
              vector: embeddingResult.embedding,
              limit: 50,
              filter: (q) => q.eq("userId", args.userId),
            },
          );

          // Filter by similarity threshold (0.75 = 75% similar)
          const filteredResults = vectorResults.filter((r) => r._score > 0.75);

          // Fetch full memory documents for matching IDs
          const memoryPromises = filteredResults.map(
            async (r): Promise<Doc<"memories"> | null> => {
              return await (
                ctx.runQuery as (
                  ref: any,
                  args: any,
                ) => Promise<Doc<"memories"> | null>
              )(internal.lib.helpers.getMemoryById, {
                id: r._id,
              });
            },
          );

          const fetchedMemories = await Promise.all(memoryPromises);

          // Filter out nulls (in case any were deleted between search and fetch)
          matches = fetchedMemories.filter(
            (m): m is Doc<"memories"> => m !== null,
          );
        } catch (error) {
          console.error("Error in semantic search:", error);
          return {
            success: false,
            message: `Semantic search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      } else if (args.mode === "category") {
        // Mode 3: Delete all in category
        try {
          // Fetch all user memories and filter by category
          const allMemories = await (
            ctx.runQuery as (ref: any, args: any) => Promise<Doc<"memories">[]>
          )(internal.memories.listAllInternal, {
            userId: args.userId,
          });
          matches = allMemories.filter(
            (m) => m.metadata.category === args.value,
          );
        } catch (error) {
          console.error("Error filtering by category:", error);
          return {
            success: false,
            message: `Failed to find memories in category "${args.value}"`,
          };
        }
      }

      // No matches found
      if (matches.length === 0) {
        return {
          success: false,
          message: `No memories found matching "${args.value}"`,
        };
      }

      // HYBRID DECISION: Single vs Multiple matches

      if (matches.length === 1) {
        // Auto-delete single match
        const memory = matches[0];

        try {
          await ctx.runMutation(internal.memories.deleteInternal, {
            id: memory._id,
          });

          return {
            success: true,
            action: "deleted",
            message: `Deleted 1 memory: "${memory.content.substring(0, 50)}${memory.content.length > 50 ? "..." : ""}"`,
            summary: {
              count: 1,
              categories: [memory.metadata.category],
            },
          };
        } catch (error) {
          console.error("Error deleting single memory:", error);
          return {
            success: false,
            message: `Failed to delete memory: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      }

      // Multiple matches - return preview (requires confirmation)
      const categories = [...new Set(matches.map((m) => m.metadata.category))];
      const categoryBreakdown = categories.reduce(
        (acc, cat) => {
          acc[cat] = matches.filter((m) => m.metadata.category === cat).length;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        success: true,
        action: "preview",
        message: `Found ${matches.length} memories matching "${args.value}". Please confirm deletion before proceeding.`,
        summary: {
          count: matches.length,
          categories,
          categoryBreakdown,
        },
        matchIds: matches.map((m) => m._id),
      };
    } catch (error) {
      console.error("Unexpected error in deleteFromTool:", error);
      return {
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
