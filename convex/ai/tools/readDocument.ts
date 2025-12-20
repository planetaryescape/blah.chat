import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

/**
 * Read document tool for Canvas.
 * Retrieves the current content of the Canvas document.
 */
export function createReadDocumentTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
) {
  return tool({
    description: `Read the current Canvas document content. Use before updates to ensure you have the latest version (user may have made manual edits).`,

    inputSchema: z.object({
      includeMetadata: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include title, language, version"),
    }),

    execute: async ({ includeMetadata = false }) => {
      try {
        const document = await (
          ctx.runQuery as (ref: any, args: any) => Promise<any>
        )(internal.canvas.documents.getByConversationInternal, {
          userId,
          conversationId,
        });

        if (!document) {
          return {
            success: false,
            hasDocument: false,
            error: "No active document in Canvas.",
          };
        }

        const result: Record<string, unknown> = {
          success: true,
          hasDocument: true,
          content: document.content,
          lineCount: document.content.split("\n").length,
        };

        if (includeMetadata) {
          result.title = document.title;
          result.language = document.language;
          result.documentType = document.documentType;
          result.version = document.version;
        }

        return result;
      } catch (error) {
        console.error("[Tool] Read document failed:", error);
        return {
          success: false,
          hasDocument: false,
          error:
            error instanceof Error ? error.message : "Failed to read document",
        };
      }
    },
  });
}
