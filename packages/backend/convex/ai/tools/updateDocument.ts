import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

const diffOperationSchema = z.object({
  type: z
    .enum(["replace", "insert", "delete"])
    .describe("Operation type: replace, insert, or delete"),
  startLine: z
    .number()
    .optional()
    .describe("Start line (1-indexed) for replace/delete"),
  endLine: z
    .number()
    .optional()
    .describe("End line (1-indexed, inclusive) for replace/delete"),
  afterLine: z
    .number()
    .optional()
    .describe("Line after which to insert (0 = start of file)"),
  content: z.string().optional().describe("New content for replace/insert"),
});

/**
 * Update document tool for Canvas.
 * Uses diff operations for efficient, targeted updates.
 */
export function createUpdateDocumentTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
) {
  return tool({
    description: `Update the Canvas document using diff operations. More efficient than sending full content.

**Diff Operation Types:**
1. **replace**: Replace lines startLine to endLine with new content
   Example: { type: "replace", startLine: 5, endLine: 5, content: "new line content" }

2. **insert**: Insert content after specified line (afterLine=0 inserts at start)
   Example: { type: "insert", afterLine: 10, content: "new content\\nmore lines" }

3. **delete**: Remove lines from startLine to endLine
   Example: { type: "delete", startLine: 3, endLine: 5 }

**Best Practices:**
- Use replace for changing existing content
- Use insert for adding new sections
- Use delete for removing sections
- Line numbers are 1-indexed (first line = 1)
- Content can include multiple lines with \\n
- Operations are applied from bottom to top (order doesn't matter)`,

    inputSchema: z.object({
      operations: z
        .array(diffOperationSchema)
        .describe("Array of diff operations to apply"),
      changeDescription: z
        .string()
        .describe("Human-readable description of changes"),
    }),

    execute: async ({ operations, changeDescription }) => {
      try {
        // Get active document
        const document = (await (ctx.runQuery as any)(
          // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
          internal.canvas.documents.getByConversationInternal,
          { userId, conversationId },
        )) as any;

        if (!document) {
          return {
            success: false,
            error: "No active document. Use createDocument first.",
          };
        }

        // Apply diff operations
        const result = (await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
          internal.canvas.documents.applyDiff,
          { userId, documentId: document._id, operations, changeDescription },
        )) as {
          version: number;
          applied: number;
          failed: string[];
          conflicts: any[];
        };

        return {
          success: result.applied > 0,
          documentId: document._id.toString(),
          newVersion: result.version,
          operationsApplied: result.applied,
          operationsFailed: result.failed.length,
          conflicts: result.conflicts.length > 0 ? result.conflicts : undefined,
          hint:
            result.conflicts.length > 0
              ? "Some operations failed due to line number mismatch. Use readDocument to get current content and retry with correct line numbers."
              : undefined,
          changeDescription,
        };
      } catch (error) {
        console.error("[Tool] Update document failed:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update document",
        };
      }
    },
  });
}
