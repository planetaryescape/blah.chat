import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

/**
 * Create document tool for Canvas.
 * Called when user wants to write/code substantial content.
 */
export function createDocumentTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
) {
  return tool({
    description: `Create a new document in the Canvas editor. Use for substantial writing or coding tasks.

✅ USE FOR:
- Writing code (scripts, components, functions)
- Writing prose (articles, essays, documentation)
- Content that will be iteratively refined
- Multi-step writing/coding tasks

❌ DO NOT USE FOR:
- Quick answers or explanations
- Short code snippets (< 20 lines)
- One-off content not meant for editing`,

    inputSchema: z.object({
      title: z
        .string()
        .describe("Document title (e.g., 'CSV Processor', 'Marketing Draft')"),
      content: z.string().describe("Initial document content"),
      documentType: z
        .enum(["code", "prose"])
        .describe("'code' for programming, 'prose' for writing"),
      language: z
        .string()
        .optional()
        .describe(
          "Programming language (e.g., 'typescript', 'python'). Only for code.",
        ),
    }),

    execute: async ({ title, content, documentType, language }) => {
      try {
        const documentId = await (
          ctx.runMutation as (
            ref: any,
            args: any,
          ) => Promise<Id<"canvasDocuments">>
        )(internal.canvas.documents.createInternal, {
          userId,
          conversationId,
          title,
          content,
          documentType,
          language: documentType === "code" ? language : undefined,
        });

        return {
          success: true,
          documentId: documentId.toString(),
          title,
          documentType,
          language,
          contentLength: content.length,
          lineCount: content.split("\n").length,
        };
      } catch (error) {
        console.error("[Tool] Create document failed:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create document",
        };
      }
    },
  });
}
