import { tool } from "ai";
import { evaluate } from "mathjs";
import { z } from "zod";

/**
 * Calculator tool for mathematical calculations.
 * Local execution - no backend action needed.
 */
export function createCalculatorTool() {
  return tool({
    description: `Perform mathematical calculations with precision.

✅ USE FOR:
- Arithmetic operations (+, -, *, /, %)
- Percentages ("15% of X" → "0.15 * X")
- Powers and roots (sqrt, cbrt, pow)
- Trigonometry (sin, cos, tan) - angles in radians by default
- Unit conversions (if specified)

❌ DO NOT USE FOR:
- Estimates or approximations (use your training)
- Complex symbolic math or calculus
- Statistical analysis on large datasets

Examples:
- "15 * 847 / 100" → 127.05
- "sqrt(144)" → 12
- "pow(2, 10)" → 1024`,

    inputSchema: z.object({
      expression: z
        .string()
        .describe(
          "Mathematical expression to evaluate (e.g., '15 * 847 / 100', 'sqrt(144)', 'pow(2, 10)')",
        ),
    }),

    execute: async ({ expression }) => {
      try {
        const result = evaluate(expression);

        // Handle different result types
        let formattedResult: string | number;
        if (typeof result === "number") {
          // Round to avoid floating point precision issues
          formattedResult = Number.isInteger(result)
            ? result
            : parseFloat(result.toFixed(10));
        } else {
          formattedResult = String(result);
        }

        return {
          success: true,
          expression,
          result: formattedResult,
        };
      } catch (error) {
        return {
          success: false,
          expression,
          error: error instanceof Error ? error.message : "Invalid expression",
        };
      }
    },
  });
}
