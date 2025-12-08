# Calculator Tool

## Overview

Perform precise mathematical calculations. LLMs are notoriously unreliable at arithmetic - this tool ensures accuracy.

---

## Priority

**🔴 HIGH PRIORITY** - Quick win, high impact, zero ongoing cost.

---

## Use Cases

- Arithmetic: "What's 15% of 847?"
- Unit conversion: "Convert 72°F to Celsius"
- Financial: "Compound interest on $10,000 at 5% for 10 years"
- Engineering: "Calculate the area of a circle with radius 5"

---

## External Dependencies

**None** - Pure local execution using JavaScript math library.

**Recommended Library:** [mathjs](https://mathjs.org/)
- Comprehensive math functions
- Expression parsing
- Unit support
- ~150KB bundle size

```bash
bun add mathjs
```

---

## Implementation Complexity

**⚡ LOW** - 30 minutes to implement

- No external API
- No backend action needed
- No environment variables

---

## Tool Schema

```typescript
inputSchema: z.object({
  expression: z.string().describe(
    "Mathematical expression to evaluate (e.g., '15 * 847 / 100', 'sqrt(144)', 'sin(45 deg)')"
  ),
})
```

---

## Example Responses

```json
// Success
{ "result": 127.05, "expression": "15 * 847 / 100" }

// Error
{ "error": "Invalid expression: unexpected character 'x'" }
```

---

## Tool Description

```
Perform mathematical calculations with precision.

✅ USE FOR:
- Arithmetic operations (+, -, *, /, %)
- Percentages ("15% of X" → 0.15 * X)
- Powers and roots (sqrt, cbrt, pow)
- Trigonometry (sin, cos, tan)
- Unit conversions (if using mathjs units)

❌ DO NOT USE FOR:
- Estimates or approximations (use your training)
- Complex symbolic math or calculus
- Statistical analysis on datasets

Returns the numeric result or an error message.
```

---

## Implementation Code

```typescript
// convex/ai/tools/calculator.ts
import { tool } from "ai";
import { z } from "zod";
import { evaluate } from "mathjs";

export function createCalculatorTool() {
  return tool({
    description: `Perform mathematical calculations with precision.

✅ USE FOR: Arithmetic, percentages, powers, roots, trigonometry
❌ DO NOT USE FOR: Estimates, symbolic math, statistics on datasets

Examples:
- "15 * 847 / 100" → 127.05
- "sqrt(144)" → 12
- "sin(45 deg)" → 0.707...`,

    inputSchema: z.object({
      expression: z.string().describe("Math expression to evaluate"),
    }),

    execute: async ({ expression }) => {
      try {
        const result = evaluate(expression);
        return {
          success: true,
          expression,
          result: typeof result === "number" ? result : String(result),
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
```

---

## Registration

```typescript
// In convex/generation.ts
import { createCalculatorTool } from "./ai/tools/calculator";

// In options.tools:
calculator: createCalculatorTool(),
```

---

## UI Display

- **Icon:** `Calculator` from lucide-react
- **Running:** "Calculating..."
- **Complete:** "= {result}"
- **Error:** "Calculation error"

---

## Testing Checklist

- [ ] Basic arithmetic: "What is 123 * 456?"
- [ ] Percentages: "Calculate 15% tip on $85.50"
- [ ] Powers: "What's 2 to the power of 10?"
- [ ] Roots: "Square root of 256"
- [ ] Trig: "Sine of 30 degrees" (if mathjs with units)
- [ ] Invalid input: "What is zzzz?" (should return error gracefully)
