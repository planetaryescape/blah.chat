import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

// Check if we can send (rate limit: 1 per hour for global alerts)
async function canSendEmail(
  // biome-ignore lint/suspicious/noExplicitAny: Convex context types
  ctx: any,
  type: string,
): Promise<boolean> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  const recentEmail = await ctx.db
    .query("emailAlerts")
    // biome-ignore lint/suspicious/noExplicitAny: Convex query types
    .withIndex("by_type_sent", (q: any) =>
      q.eq("type", type).gt("sentAt", oneHourAgo),
    )
    .first();

  return recentEmail === null;
}

// Check if we can send to a specific user (rate limit: 1 per type per user, ever)
async function canSendEmailToUser(
  // biome-ignore lint/suspicious/noExplicitAny: Convex context types
  ctx: any,
  type: string,
  userId: string,
): Promise<boolean> {
  // Check if we've ever sent this type to this user
  const existingEmail = await ctx.db
    .query("emailAlerts")
    // biome-ignore lint/suspicious/noExplicitAny: Convex query types
    .withIndex("by_type_sent", (q: any) => q.eq("type", type))
    .filter((q: any) =>
      q.eq(q.field("metadata.userId"), userId),
    )
    .first();

  return existingEmail === null;
}

// Record sent email
async function recordSentEmail(
  // biome-ignore lint/suspicious/noExplicitAny: Convex context types
  ctx: any,
  type: string,
  recipientEmail: string,
  // biome-ignore lint/suspicious/noExplicitAny: Email metadata types
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
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await canSendEmail(ctx, args.type);
  },
});

// Check if we can send to a specific user (one-time per type per user)
export const checkCanSendToUser = internalMutation({
  args: {
    type: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await canSendEmailToUser(ctx, args.type, args.userId);
  },
});

export const recordSent = internalMutation({
  args: {
    type: v.string(),
    recipientEmail: v.string(),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    await recordSentEmail(ctx, args.type, args.recipientEmail, args.metadata);
  },
});
