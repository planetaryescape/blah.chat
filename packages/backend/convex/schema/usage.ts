/**
 * Usage Records and TTS Cache table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const usageRecordsTable = defineTable({
  userId: v.id("users"),
  date: v.string(),
  model: v.string(),
  conversationId: v.optional(v.id("conversations")),
  feature: v.optional(
    v.union(
      v.literal("chat"),
      v.literal("notes"),
      v.literal("tasks"),
      v.literal("files"),
      v.literal("memory"),
      v.literal("smart_assistant"),
    ),
  ),
  operationType: v.optional(
    v.union(
      v.literal("text"),
      v.literal("tts"),
      v.literal("stt"),
      v.literal("image"),
      v.literal("embedding"),
    ),
  ),
  inputTokens: v.number(),
  outputTokens: v.number(),
  reasoningTokens: v.optional(v.number()),
  cost: v.number(),
  messageCount: v.number(),
  warningsSent: v.optional(v.array(v.string())),
  isByok: v.optional(v.boolean()),
})
  .index("by_user_date", ["userId", "date"])
  .index("by_user", ["userId"])
  .index("by_user_date_model", ["userId", "date", "model"])
  .index("by_conversation", ["conversationId"])
  .index("by_user_feature", ["userId", "feature"]);

export const ttsCacheTable = defineTable({
  hash: v.string(),
  storageId: v.id("_storage"),
  text: v.string(),
  voice: v.string(),
  speed: v.number(),
  format: v.string(),
  createdAt: v.number(),
  lastAccessedAt: v.number(),
}).index("by_hash", ["hash"]);
