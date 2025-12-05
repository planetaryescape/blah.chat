import { v } from "convex/values";
import { mutation } from "./_generated/server";
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

		// 1. Insert into votes table (for analytics/leaderboard)
		await ctx.db.insert("votes", {
			userId: user._id,
			comparisonGroupId: args.comparisonGroupId,
			winnerId: args.winnerId,
			rating: args.rating,
			votedAt: Date.now(),
		});

		// 2. Embed in message records (dual persistence for quick access)
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_comparison_group", (q) =>
				q.eq("comparisonGroupId", args.comparisonGroupId),
			)
			.collect();

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
