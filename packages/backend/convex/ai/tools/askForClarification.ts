/**
 * Tool: Ask for Clarification
 *
 * Allows the AI to pause and ask the user for clarification when:
 * - Multiple searches haven't yielded high-quality results
 * - The query is ambiguous
 * - Budget is running low and results are uncertain
 */

import { tool } from "ai";
import { z } from "zod";

export function createAskForClarificationTool() {
  return tool({
    description: `Ask user for clarification when:
- Multiple searches without finding high-quality results
- Query is ambiguous and could mean different things
- Budget running low and not confident in current results
- Need specific details to provide a good answer

Use this instead of continuing to search when stuck. The user will see your question
and can provide more context or choose from suggested options.`,
    inputSchema: z.object({
      question: z.string().describe("The clarifying question to ask the user"),
      context: z
        .string()
        .describe(
          "Brief explanation of what you found and why you need clarification",
        ),
      options: z
        .array(z.string())
        .max(4)
        .optional()
        .describe("2-4 suggested answers the user can choose from"),
    }),
    execute: async ({ question, context, options }) => {
      return {
        success: true,
        clarification: { question, context, options },
      };
    },
  });
}
