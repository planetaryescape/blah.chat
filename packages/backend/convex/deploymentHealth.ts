import { query } from "./_generated/server";

// Public readiness probe: no account data or configuration secrets are returned.
export const check = query({
  args: {},
  handler: async (ctx) => ({
    backend: "convex" as const,
    modelsReady: (await ctx.db.query("models").first()) !== null,
  }),
});
