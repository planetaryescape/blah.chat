# Date/Time Tool

## Overview

Provide current date/time and perform calendar calculations. LLMs have training cutoffs and don't know "today."

---

## Priority

**🔴 HIGH PRIORITY** - Quick win, essential for any time-aware assistant.

---

## Use Cases

- Current time: "What time is it?"
- Date queries: "What day is today?"
- Calculations: "What date is 3 weeks from Tuesday?"
- Time zones: "What time is it in Tokyo?"
- Duration: "How many days until Christmas?"

---

## External Dependencies

**None** - Pure local execution using JavaScript Date APIs.

**Recommended Libraries:**
- [date-fns](https://date-fns.org/) - Lightweight, tree-shakeable
- [dayjs](https://day.js.org/) - 2KB alternative to Moment.js

```bash
bun add date-fns
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
  operation: z.enum([
    "current",      // Get current date/time
    "add",          // Add duration to date
    "subtract",     // Subtract duration from date
    "difference",   // Days/hours between dates
    "format",       // Format a date
  ]).describe("Operation to perform"),

  timezone: z.string().optional().describe(
    "IANA timezone (e.g., 'America/New_York', 'Asia/Tokyo')"
  ),

  baseDate: z.string().optional().describe(
    "Starting date in ISO format (defaults to now)"
  ),

  duration: z.object({
    value: z.number(),
    unit: z.enum(["days", "weeks", "months", "years", "hours", "minutes"]),
  }).optional().describe("Duration to add/subtract"),

  targetDate: z.string().optional().describe(
    "Target date for difference calculation"
  ),
})
```

---

## Example Responses

```json
// Current time
{
  "operation": "current",
  "result": "2024-12-08T15:20:00.000Z",
  "formatted": "Sunday, December 8, 2024 at 3:20 PM",
  "timezone": "UTC"
}

// Add duration
{
  "operation": "add",
  "baseDate": "2024-12-08",
  "duration": { "value": 3, "unit": "weeks" },
  "result": "2024-12-29",
  "formatted": "Sunday, December 29, 2024"
}

// Difference
{
  "operation": "difference",
  "from": "2024-12-08",
  "to": "2024-12-25",
  "result": { "days": 17, "weeks": 2, "readable": "17 days" }
}
```

---

## Tool Description

```
Get current date/time and perform calendar calculations.

✅ USE FOR:
- Current time in any timezone
- Date arithmetic ("3 weeks from now")
- Duration between dates ("days until X")
- Day of week queries

❌ DO NOT USE FOR:
- Historical events (use your training)
- Timezone database lookups without specific calculation

Operations: current, add, subtract, difference
```

---

## Implementation Code

```typescript
// convex/ai/tools/datetime.ts
import { tool } from "ai";
import { z } from "zod";
import {
  addDays, addWeeks, addMonths, addYears,
  differenceInDays, format, parseISO
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function createDateTimeTool() {
  return tool({
    description: `Get current date/time and perform calendar calculations.

✅ USE FOR: Current time, date math, days until X
❌ DO NOT USE FOR: Historical events

Operations: current, add, subtract, difference`,

    inputSchema: z.object({
      operation: z.enum(["current", "add", "subtract", "difference"]),
      timezone: z.string().optional().default("UTC"),
      baseDate: z.string().optional(),
      duration: z.object({
        value: z.number(),
        unit: z.enum(["days", "weeks", "months", "years"]),
      }).optional(),
      targetDate: z.string().optional(),
    }),

    execute: async ({ operation, timezone, baseDate, duration, targetDate }) => {
      const now = new Date();
      const base = baseDate ? parseISO(baseDate) : now;

      try {
        switch (operation) {
          case "current":
            return {
              success: true,
              iso: now.toISOString(),
              formatted: formatInTimeZone(now, timezone, "EEEE, MMMM d, yyyy 'at' h:mm a"),
              timezone,
            };

          case "add":
          case "subtract": {
            if (!duration) return { success: false, error: "Duration required" };
            const multiplier = operation === "subtract" ? -1 : 1;
            const value = duration.value * multiplier;

            let result: Date;
            switch (duration.unit) {
              case "days": result = addDays(base, value); break;
              case "weeks": result = addWeeks(base, value); break;
              case "months": result = addMonths(base, value); break;
              case "years": result = addYears(base, value); break;
            }

            return {
              success: true,
              result: result.toISOString(),
              formatted: format(result, "EEEE, MMMM d, yyyy"),
            };
          }

          case "difference": {
            if (!targetDate) return { success: false, error: "Target date required" };
            const target = parseISO(targetDate);
            const days = differenceInDays(target, base);
            return {
              success: true,
              days,
              weeks: Math.floor(days / 7),
              readable: `${Math.abs(days)} days ${days >= 0 ? "from now" : "ago"}`,
            };
          }
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  });
}
```

---

## Registration

```typescript
// In convex/generation.ts
import { createDateTimeTool } from "./ai/tools/datetime";

// In options.tools:
datetime: createDateTimeTool(),
```

---

## UI Display

- **Icon:** `Calendar` or `Clock` from lucide-react
- **Running:** "Checking time..."
- **Complete:** "{formatted date/time}"

---

## Testing Checklist

- [ ] "What time is it?"
- [ ] "What day is today?"
- [ ] "What time is it in Tokyo?"
- [ ] "What date is 2 weeks from now?"
- [ ] "How many days until December 25?"
- [ ] "What day of the week is January 1, 2025?"
