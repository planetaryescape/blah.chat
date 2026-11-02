import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

export function createCodeExecutionTool(ctx: ActionCtx) {
  return tool({
    description:
      "Execute Python or JavaScript code in a secure sandboxed environment. Supports data analysis, calculations, plotting/visualization, and algorithm testing. Returns stdout, stderr, return values, and any generated images (plots). Use this when the user asks to run code, analyze data, create visualizations, or test algorithms.",
    inputSchema: z.object({
      code: z
        .string()
        .describe(
          "The code to execute. For Python, can use libraries like numpy, pandas, matplotlib. For JavaScript, standard Node.js libraries are available.",
        ),
      language: z
        .enum(["python", "javascript"])
        .describe("Programming language of the code"),
      timeout: z
        .number()
        .optional()
        .describe(
          "Maximum execution time in seconds (default: 30s, max: 60s). Use for long-running computations.",
        ),
    }),
    execute: async ({ code, language, timeout }) => {
      // Enforce timeout limits
      const effectiveTimeout = Math.min(timeout || 30, 60);

      const result = await ctx.runAction(
        internal.tools.codeExecution.executeCode,
        {
          code,
          language,
          timeout: effectiveTimeout,
        },
      );

      return result;
    },
  });
}
