import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

export function createProjectContextTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  conversationId?: Id<"conversations">,
) {
  return tool({
    description: `Retrieve context from the current project (workspace).

✅ USE FOR:
- "What is this project about?"
- "Show me project requirements"
- "What files are in this project?"
- "Recent project activity"

Returns project details: name, description, context, notes, files, or conversation history.`,

    inputSchema: z.object({
      section: z
        .enum(["context", "notes", "files", "history"])
        .optional()
        .default("context")
        .describe(
          "Section to retrieve: 'context' (project details), 'notes' (project notes), 'files' (attached files), 'history' (recent conversations)",
        ),
    }),

    execute: async ({ section }) => {
      const result = await ctx.runAction(internal.tools.projectContext.get, {
        userId,
        conversationId,
        section,
      });

      return result;
    },
  });
}
