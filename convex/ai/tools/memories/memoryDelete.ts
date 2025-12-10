import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";

/**
 * Memory deletion tool factory
 * Creates a tool instance that allows AI to delete user memories
 *
 * Supports three deletion modes:
 * - By ID: Delete specific memory by database ID
 * - Semantic: "Forget about X" - finds similar memories via vector search
 * - Category: Delete all memories in a category (identity/preference/project/context/relationship)
 *
 * Hybrid behavior:
 * - Single match: Deletes immediately
 * - Multiple matches: Returns preview, requires user confirmation
 */
export function createMemoryDeleteTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    description: `Delete user memories. Supports three modes:

1. By ID: Delete a specific memory by its database ID
   - Most precise deletion method
   - Use when you know the exact memory ID

2. Semantic: "Forget about X" - finds similar memories
   - Natural language queries like "forget my address" or "delete work info"
   - Uses vector similarity search (threshold > 0.75)
   - Good for user requests like "forget this" or "delete that"

3. Category: Delete all memories in a category
   - Categories: identity, preference, project, context, relationship
   - Use for bulk operations like "delete all work memories"

HYBRID BEHAVIOR (important):
- Single match found: Deletes immediately and returns confirmation
- Multiple matches found: Returns preview with count and categories, requires follow-up confirmation

When to use:
- User says "forget this", "delete that memory", "remove my address"
- User wants to remove specific information from the system
- User requests deletion of a category of information`,

    inputSchema: z.object({
      mode: z
        .enum(["id", "semantic", "category"])
        .describe(
          "Deletion mode: 'id' for exact match, 'semantic' for natural language query, 'category' for bulk deletion",
        ),
      value: z
        .string()
        .describe(
          "The value to search for: memory ID (for 'id' mode), semantic query (for 'semantic' mode), or category name (for 'category' mode)",
        ),
      reasoning: z
        .string()
        .min(10)
        .max(200)
        .describe(
          "Explain why you're deleting this memory. Required for audit trail.",
        ),
    }),

    execute: async (input) => {
      try {
        const result = await ctx.runAction(
          internal.memories.delete.deleteFromTool,
          {
            userId,
            mode: input.mode,
            value: input.value,
            reasoning: input.reasoning,
          },
        );
        return result;
      } catch (error) {
        console.error("[Tool] Memory deletion failed:", error);
        return {
          success: false,
          message: `Failed to delete memory: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
}
