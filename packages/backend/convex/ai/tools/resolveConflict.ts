import { tool } from "ai";
import { z } from "zod";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

/**
 * Conflict resolution tool for Canvas.
 * Called when updateDocument encounters conflicts that need resolution.
 */
export function createResolveConflictTool(
  _ctx: ActionCtx,
  _userId: Id<"users">,
  _conversationId: Id<"conversations">,
) {
  return tool({
    description: `Handle a diff conflict that occurred when applying changes to the Canvas document.

Called automatically when updateDocument encounters conflicts.

**Resolution Strategies:**

1. **retry_with_read**: Read current document state and generate new diffs based on actual content.
   Best for: Line number mismatches due to document drift.

2. **force_replace**: Replace the conflicting section entirely with the new content.
   Best for: When you're confident the new content is correct.
   Warning: May overwrite user edits.

3. **ask_user**: Present conflict to user for manual resolution.
   Best for: When user edits are important and shouldn't be lost.
   The user will choose: keep their version, use AI version, or merge both.

Choose based on conflict severity and whether user data might be lost.`,

    inputSchema: z.object({
      strategy: z
        .enum(["retry_with_read", "force_replace", "ask_user"])
        .describe("Resolution strategy to use"),
      conflictDescription: z
        .string()
        .describe("Description of what went wrong"),
      proposedFix: z
        .string()
        .optional()
        .describe("For retry: what you'll do differently"),
    }),

    execute: async ({ strategy, conflictDescription, proposedFix }) => {
      switch (strategy) {
        case "retry_with_read":
          return {
            success: true,
            action: "retry",
            message:
              "Please use readDocument to get current content, then send new diffs based on actual line numbers.",
            conflictDescription,
            proposedFix,
          };

        case "force_replace":
          return {
            success: true,
            action: "force",
            message:
              "Will replace content forcefully. User edits in conflicting sections may be lost.",
            warning: "This may overwrite user changes.",
            conflictDescription,
          };

        case "ask_user":
          return {
            success: true,
            action: "ask_user",
            message:
              "Please ask the user how they want to resolve this conflict.",
            conflictDescription,
            suggestUserOptions: [
              "Keep my version",
              "Use AI version",
              "Merge both versions",
            ],
          };

        default:
          return {
            success: false,
            error: "Unknown resolution strategy",
          };
      }
    },
  });
}
