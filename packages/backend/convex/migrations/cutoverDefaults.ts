import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { DEFAULT_MODEL_ID } from "@blah-chat/ai/operational-models";
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/** Explicit post-import operational repair; never rewrites historical models. */
export const useAvailableTextDefault = internalMutation({
  args: { acknowledgeProviderOutage: v.literal(true) },
  handler: async (ctx) => {
    const preferences = await ctx.db
      .query("userPreferences")
      .filter((q) => q.eq(q.field("key"), "defaultModel"))
      .collect();
    const changedFrom: Record<string, number> = {};
    for (const preference of preferences) {
      const configured =
        typeof preference.value === "string"
          ? MODEL_CONFIG[preference.value]
          : undefined;
      // Preserve working direct choices, not just the centralized default.
      if (configured?.gateway === "groq" || configured?.gateway === "cerebras")
        continue;
      const previous =
        typeof preference.value === "string" ? preference.value : "invalid";
      await ctx.db.patch(preference._id, {
        value: DEFAULT_MODEL_ID,
        updatedAt: Date.now(),
      });
      changedFrom[previous] = (changedFrom[previous] ?? 0) + 1;
    }
    return { defaultModel: DEFAULT_MODEL_ID, changedFrom };
  },
});
