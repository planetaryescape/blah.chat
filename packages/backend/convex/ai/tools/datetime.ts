import { tool } from "ai";
import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  format,
  parseISO,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { z } from "zod";

/**
 * DateTime tool for time operations.
 * Local execution - no backend action needed.
 */
export function createDateTimeTool() {
  return tool({
    description: `Get current date/time. ALWAYS use this for time-related queries - never guess the date/time.

Examples of when to use:
- "What time is it?" → Use this
- "What's today's date?" → Use this
- "3 weeks from now" → Use this
- "Days until Christmas" → Use this
- Any question involving current time/date → Use this

Operations: current, add, subtract, difference`,

    inputSchema: z.object({
      operation: z
        .enum(["current", "add", "subtract", "difference"])
        .describe("Operation to perform"),

      timezone: z
        .string()
        .optional()
        .default("UTC")
        .describe("IANA timezone (e.g., 'America/New_York', 'Asia/Tokyo')"),

      baseDate: z
        .string()
        .optional()
        .describe("Starting date in ISO format (defaults to now)"),

      duration: z
        .object({
          value: z.number(),
          unit: z.enum([
            "minutes",
            "hours",
            "days",
            "weeks",
            "months",
            "years",
          ]),
        })
        .optional()
        .describe("Duration to add/subtract"),

      targetDate: z
        .string()
        .optional()
        .describe("Target date for difference calculation"),
    }),

    execute: async ({
      operation,
      timezone = "UTC",
      baseDate,
      duration,
      targetDate,
    }) => {
      const now = new Date();
      const base = baseDate ? parseISO(baseDate) : now;

      try {
        switch (operation) {
          case "current": {
            const zonedDate = toZonedTime(now, timezone);
            return {
              success: true,
              operation: "current",
              iso: now.toISOString(),
              formatted: formatInTimeZone(
                now,
                timezone,
                "EEEE, MMMM d, yyyy 'at' h:mm a zzz",
              ),
              timezone,
              components: {
                year: zonedDate.getFullYear(),
                month: zonedDate.getMonth() + 1,
                day: zonedDate.getDate(),
                dayOfWeek: format(zonedDate, "EEEE"),
                hour: zonedDate.getHours(),
                minute: zonedDate.getMinutes(),
              },
            };
          }

          case "add":
          case "subtract": {
            if (!duration) {
              return {
                success: false,
                error: "Duration required for add/subtract operation",
              };
            }

            const multiplier = operation === "subtract" ? -1 : 1;
            const value = duration.value * multiplier;

            let result: Date;
            switch (duration.unit) {
              case "minutes":
                result = addMinutes(base, value);
                break;
              case "hours":
                result = addHours(base, value);
                break;
              case "days":
                result = addDays(base, value);
                break;
              case "weeks":
                result = addWeeks(base, value);
                break;
              case "months":
                result = addMonths(base, value);
                break;
              case "years":
                result = addYears(base, value);
                break;
            }

            return {
              success: true,
              operation,
              baseDate: base.toISOString(),
              duration,
              result: result.toISOString(),
              formatted: format(result, "EEEE, MMMM d, yyyy"),
            };
          }

          case "difference": {
            if (!targetDate) {
              return {
                success: false,
                error: "Target date required for difference calculation",
              };
            }

            const target = parseISO(targetDate);
            const days = differenceInDays(target, base);
            const hours = differenceInHours(target, base);
            const minutes = differenceInMinutes(target, base);

            return {
              success: true,
              operation: "difference",
              from: base.toISOString(),
              to: target.toISOString(),
              difference: {
                days,
                hours,
                minutes,
                weeks: Math.floor(days / 7),
              },
              readable:
                days >= 0
                  ? `${days} day${days !== 1 ? "s" : ""} from now`
                  : `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`,
            };
          }

          default:
            return {
              success: false,
              error: `Unknown operation: ${operation}`,
            };
        }
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Date operation failed",
        };
      }
    },
  });
}
