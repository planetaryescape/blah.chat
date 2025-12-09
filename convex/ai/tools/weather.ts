import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

export function createWeatherTool(ctx: ActionCtx) {
  return tool({
    description: `Get current weather and 3-day forecast for any city.

✅ USE FOR:
- Current weather: "What's the weather in Tokyo?"
- Forecasts: "Will it rain in London tomorrow?"
- Temperature checks: "Is it cold in New York?"

Returns current temperature, wind speed, weather conditions, and 3-day forecast.`,
    inputSchema: z.object({
      city: z
        .string()
        .describe(
          "City name to get weather for (e.g., 'San Francisco', 'London', 'Tokyo')",
        ),
      units: z
        .enum(["celsius", "fahrenheit"])
        .optional()
        .describe("Temperature unit (default: celsius)"),
    }),
    execute: async ({ city, units }) => {
      const result = await ctx.runAction(internal.tools.weather.getWeather, {
        city,
        units,
      });

      return result;
    },
  });
}
