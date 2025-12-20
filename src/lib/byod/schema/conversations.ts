import { defineTable } from "convex/server";
import { v } from "convex/values";

export const conversationsTable = {
	conversations: defineTable({
		userId: v.string(), // Clerk user ID (not Convex ID since main DB has users)
		title: v.optional(v.string()),
		model: v.optional(v.string()),
		systemPrompt: v.optional(v.string()),
		isArchived: v.optional(v.boolean()),
		isPinned: v.optional(v.boolean()),
		lastMessageAt: v.optional(v.number()),
		messageCount: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_user_archived", ["userId", "isArchived"])
		.index("by_user_pinned", ["userId", "isPinned"])
		.index("by_user_last_message", ["userId", "lastMessageAt"])
		.searchIndex("search_title", {
			searchField: "title",
			filterFields: ["userId"],
		}),

	conversationParticipants: defineTable({
		conversationId: v.id("conversations"),
		clerkId: v.string(),
		role: v.union(
			v.literal("owner"),
			v.literal("collaborator"),
			v.literal("viewer"),
		),
		joinedAt: v.number(),
	})
		.index("by_conversation", ["conversationId"])
		.index("by_user", ["clerkId"])
		.index("by_conversation_user", ["conversationId", "clerkId"]),
};
