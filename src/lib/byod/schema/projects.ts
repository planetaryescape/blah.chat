import { defineTable } from "convex/server";
import { v } from "convex/values";

export const projectsTable = {
	projects: defineTable({
		userId: v.string(),
		name: v.string(),
		description: v.optional(v.string()),
		color: v.optional(v.string()),
		icon: v.optional(v.string()),
		isArchived: v.optional(v.boolean()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_user_archived", ["userId", "isArchived"]),

	projectConversations: defineTable({
		projectId: v.id("projects"),
		conversationId: v.id("conversations"),
		addedAt: v.number(),
		addedBy: v.string(),
	})
		.index("by_project", ["projectId"])
		.index("by_conversation", ["conversationId"])
		.index("by_project_conversation", ["projectId", "conversationId"]),

	projectNotes: defineTable({
		projectId: v.id("projects"),
		noteId: v.id("notes"),
		addedAt: v.number(),
		addedBy: v.string(),
	})
		.index("by_project", ["projectId"])
		.index("by_note", ["noteId"]),

	projectFiles: defineTable({
		projectId: v.id("projects"),
		fileId: v.id("files"),
		addedAt: v.number(),
		addedBy: v.string(),
	})
		.index("by_project", ["projectId"])
		.index("by_file", ["fileId"]),
};
