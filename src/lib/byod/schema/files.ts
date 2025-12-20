import { defineTable } from "convex/server";
import { v } from "convex/values";

export const filesTable = {
	files: defineTable({
		userId: v.string(),
		storageId: v.optional(v.id("_storage")),
		filename: v.string(),
		mimeType: v.string(),
		size: v.number(),
		url: v.optional(v.string()),
		status: v.optional(
			v.union(
				v.literal("uploading"),
				v.literal("processing"),
				v.literal("ready"),
				v.literal("error"),
			),
		),
		error: v.optional(v.string()),
		metadata: v.optional(v.any()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_user_status", ["userId", "status"]),

	fileChunks: defineTable({
		fileId: v.id("files"),
		userId: v.string(),
		chunkIndex: v.number(),
		content: v.string(),
		embedding: v.optional(v.array(v.float64())),
		createdAt: v.number(),
	})
		.index("by_file", ["fileId"])
		.index("by_user", ["userId"])
		.vectorIndex("embedding", {
			vectorField: "embedding",
			dimensions: 1536,
			filterFields: ["userId", "fileId"],
		}),
};
