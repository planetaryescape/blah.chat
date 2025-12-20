import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

/**
 * Update document tool for Canvas.
 * Modifies the content of an existing Canvas document.
 */
export function createUpdateDocumentTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
) {
  return tool({
    description: `Update the content of the current Canvas document. Use after createDocument to make changes.

Note: Currently replaces full content. Diff support coming in Phase 4.`,

    inputSchema: z.object({
      content: z.string().describe("The complete updated document content"),
      changeDescription: z
        .string()
        .describe("Brief description of what changed"),
    }),

    execute: async ({ content, changeDescription }) => {
      try {
        // Get active document
        const document = await (
          ctx.runQuery as (ref: any, args: any) => Promise<any>
        )(internal.canvas.documents.getByConversationInternal, {
          userId,
          conversationId,
        });

        if (!document) {
          return {
            success: false,
            error: "No active document. Use createDocument first.",
          };
        }

        const result = await (
          ctx.runMutation as (
            ref: any,
            args: any,
          ) => Promise<{ version: number }>
        )(internal.canvas.documents.updateContentInternal, {
          userId,
          documentId: document._id,
          content,
          source: "llm_diff" as const,
          diff: changeDescription,
        });

        return {
          success: true,
          documentId: document._id.toString(),
          newVersion: result.version,
          contentLength: content.length,
          lineCount: content.split("\n").length,
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
