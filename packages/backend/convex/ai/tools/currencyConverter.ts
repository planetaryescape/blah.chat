import { tool } from "ai";
import { z } from "zod";

/**
 * Currency converter tool using Frankfurter API (ECB exchange rates).
 * Local execution - no backend action needed.
 */
export function createCurrencyConverterTool() {
  return tool({
    description: `Convert between currencies using live exchange rates (ECB data).

✅ USE FOR:
- Currency conversions (e.g., "100 USD to EUR")
- Exchange rate lookups between currencies
- Comparing currency values

❌ DO NOT USE FOR:
- Cryptocurrency conversions (not supported)
- Historical rates (only current rates available)

Supported currencies: AUD, BGN, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HKD, HUF, IDR, ILS, INR, ISK, JPY, KRW, MXN, MYR, NOK, NZD, PHP, PLN, RON, SEK, SGD, THB, TRY, USD, ZAR`,

    inputSchema: z.object({
      amount: z.number().positive().describe("Amount to convert"),
      from: z
        .string()
        .length(3)
        .transform((s) => s.toUpperCase())
        .describe("Source currency code (e.g., USD, EUR, GBP)"),
      to: z
        .string()
        .length(3)
        .transform((s) => s.toUpperCase())
        .describe("Target currency code (e.g., EUR, JPY, CAD)"),
    }),

    execute: async ({ amount, from, to }) => {
      try {
        const res = await fetch(
          `https://api.frankfurter.dev/v1/latest?amount=${amount}&from=${from}&to=${to}`,
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API error: ${res.status} - ${text}`);
        }

        const data = await res.json();
        const result = data.rates[to];

        if (result === undefined) {
          throw new Error(`Currency ${to} not found in response`);
        }

        return {
          success: true,
          amount,
          from,
          to,
          result,
          rate: result / amount,
          date: data.date,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Conversion failed",
        };
      }
    },
  });
}
