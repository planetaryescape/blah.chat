import { defineTable } from "convex/server";
import { v } from "convex/values";

export const usageTable = {
	usageRecords: defineTable({
		userId: v.string(),
		date: v.string(), // YYYY-MM-DD
		model: v.string(),
		inputTokens: v.number(),
		outputTokens: v.number(),
		cost: v.number(),
		requestCount: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_user_date", ["userId", "date"])
		.index("by_user_model", ["userId", "model"]),

	// TTS cache
	ttsCache: defineTable({
		hash: v.string(), // Hash of text + voice + settings
		storageId: v.id("_storage"),
		text: v.string(),
		voice: v.string(),
		createdAt: v.number(),
		expiresAt: v.number(),
	})
		.index("by_hash", ["hash"])
		.index("by_expires", ["expiresAt"]),
};
