import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

// Check if we can send (rate limit: 1 per hour)
async function canSendEmail(
  ctx: any,
  type: "budget_80_percent" | "budget_exceeded" | "api_credits_exhausted",
): Promise<boolean> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  const recentEmail = await ctx.db
    .query("emailAlerts")
    .withIndex("by_type_sent", (q: any) =>
      q.eq("type", type).gt("sentAt", oneHourAgo),
    )
    .first();

  return recentEmail === null;
}

// Record sent email
async function recordSentEmail(
  ctx: any,
  type: "budget_80_percent" | "budget_exceeded" | "api_credits_exhausted",
  recipientEmail: string,
  metadata: any,
) {
  await ctx.db.insert("emailAlerts", {
    type,
    recipientEmail,
    sentAt: Date.now(),
    metadata,
  });
}

// Internal mutations for rate limiting
export const checkCanSend = internalMutation({
  args: {
    type: v.union(
      v.literal("budget_80_percent"),
      v.literal("budget_exceeded"),
      v.literal("api_credits_exhausted"),
    ),
  },
  handler: async (ctx, args) => {
    return await canSendEmail(ctx, args.type);
  },
});

export const recordSent = internalMutation({
  args: {
    type: v.union(
      v.literal("budget_80_percent"),
      v.literal("budget_exceeded"),
      v.literal("api_credits_exhausted"),
    ),
    recipientEmail: v.string(),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    await recordSentEmail(ctx, args.type, args.recipientEmail, args.metadata);
  },
});
