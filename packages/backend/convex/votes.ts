import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthorizedComparison } from "./lib/comparisonAccess";
import { getCurrentUserOrCreate } from "./lib/userSync";

export const recordVote = mutation({
  args: {
    comparisonGroupId: v.string(),
    winnerId: v.optional(v.id("messages")),
    rating: v.union(
      v.literal("left_better"),
      v.literal("right_better"),
      v.literal("tie"),
      v.literal("both_bad"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const messages = await getAuthorizedComparison(
      ctx,
      args.comparisonGroupId,
      user._id,
    );
    const responses = messages.filter(
      (message) => message.role === "assistant",
    );
    if (!responses.length) throw new Error("Invalid comparison group");
    if (
      args.winnerId &&
      !responses.some((message) => message._id === args.winnerId)
    )
      throw new Error("Winner is not a response in this comparison group");
    const picksWinner =
      args.rating === "left_better" || args.rating === "right_better";
    if (picksWinner !== Boolean(args.winnerId))
      throw new Error("Winner must match the vote rating");

    // 1. Insert into votes table (for analytics/leaderboard)
    await ctx.db.insert("votes", {
      userId: user._id,
      comparisonGroupId: args.comparisonGroupId,
      winnerId: args.winnerId,
      rating: args.rating,
      votedAt: Date.now(),
    });

    // 2. Embed in message records (dual persistence for quick access)
    for (const msg of messages) {
      await ctx.db.patch(msg._id, {
        votes: {
          rating: args.rating,
          isWinner: msg._id === args.winnerId,
          votedAt: Date.now(),
        },
      });
    }

    return { success: true };
  },
});
