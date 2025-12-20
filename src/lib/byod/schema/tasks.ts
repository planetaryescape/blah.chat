import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tasksTable = {
	tasks: defineTable({
		userId: v.string(),
		title: v.string(),
		description: v.optional(v.string()),
		status: v.union(
			v.literal("todo"),
			v.literal("in_progress"),
			v.literal("done"),
			v.literal("cancelled"),
		),
		priority: v.optional(
			v.union(
				v.literal("low"),
				v.literal("medium"),
				v.literal("high"),
				v.literal("urgent"),
			),
		),
		dueDate: v.optional(v.number()),
		completedAt: v.optional(v.number()),
		sourceConversationId: v.optional(v.id("conversations")),
		sourceMessageId: v.optional(v.id("messages")),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_user_status", ["userId", "status"])
		.index("by_user_due", ["userId", "dueDate"])
		.index("by_source_conversation", ["sourceConversationId"]),
};
