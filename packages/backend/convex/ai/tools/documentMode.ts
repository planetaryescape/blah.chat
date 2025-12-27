import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

export function createEnterDocumentModeTool(
  ctx: ActionCtx,
  conversationId: Id<"conversations">,
) {
  return tool({
    description: `Enter document editing mode. Opens Canvas editor.

✅ USE FOR:
- "Write me a..." / "Create a..." / "Draft a..."
- Code, scripts, articles, documentation
- Content needing iteration

❌ DO NOT USE FOR:
- Quick answers or explanations
- Short code snippets (< 20 lines)
- Q&A conversations`,

    inputSchema: z.object({
      reason: z.string().describe("Brief reason for entering document mode"),
    }),

    execute: async ({ reason }) => {
      try {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.conversations.setModeInternal,
          { conversationId, mode: "document" },
        );

        return {
          success: true,
          mode: "document",
          message: "Document mode activated. Use createDocument to start.",
          reason,
        };
      } catch (error) {
        console.error("[Tool] Enter document mode failed:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to enter mode",
        };
      }
    },
  });
}

export function createExitDocumentModeTool(
  ctx: ActionCtx,
  conversationId: Id<"conversations">,
) {
  return tool({
    description: `Exit document editing mode. Closes Canvas.

✅ USE FOR:
- Document work is complete
- User says "done", "that's good", etc.
- User shifts to unrelated topic`,

    inputSchema: z.object({
      reason: z.string().describe("Brief reason for exiting"),
    }),

    execute: async ({ reason }) => {
      try {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.conversations.setModeInternal,
          { conversationId, mode: "normal" },
        );

        return {
          success: true,
          mode: "normal",
          message: "Exited document mode.",
          reason,
        };
      } catch (error) {
        console.error("[Tool] Exit document mode failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to exit mode",
        };
      }
    },
  });
}
