import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { getCurrentUserOrCreate } from "./lib/userSync";

export type ApiRateLimitOperation = Doc<"rateLimitEvents">["operation"];

export const consume = mutation({
  args: {
    operation: v.union(v.literal("regenerate"), v.literal("hybrid-search")),
  },
  handler: async (ctx, { operation }) => {
    const user = await getCurrentUserOrCreate(ctx);
    const now = Date.now();
    const cutoff = now - 60 * 60 * 1000;
    const recent = await ctx.db
      .query("rateLimitEvents")
      .withIndex("by_user_operation_createdAt", (q) =>
        q
          .eq("userId", user._id)
          .eq("operation", operation)
          .gt("createdAt", cutoff),
      )
      .take(60);
    if (recent.length >= 60) return { allowed: false };

    // The range read and insert share one transaction: concurrent last-slot
    // callers conflict and retry against the updated quota.
    await ctx.db.insert("rateLimitEvents", {
      userId: user._id,
      operation,
      createdAt: now,
    });
    const expired = await ctx.db
      .query("rateLimitEvents")
      .withIndex("by_user_operation_createdAt", (q) =>
        q
          .eq("userId", user._id)
          .eq("operation", operation)
          .lte("createdAt", cutoff),
      )
      .take(100);
    for (const event of expired) await ctx.db.delete(event._id);
    return { allowed: true };
  },
});
