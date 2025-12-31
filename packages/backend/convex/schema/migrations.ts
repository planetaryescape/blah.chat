/**
 * Migrations and Jobs table module
 * Main DB only - NOT included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const migrationsTable = defineTable({
  migrationId: v.string(),
  name: v.string(),
  phase: v.union(
    v.literal("schema"),
    v.literal("backfill"),
    v.literal("dual-write"),
    v.literal("dual-read"),
    v.literal("cleanup"),
    v.literal("complete"),
  ),
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("rolled-back"),
  ),
  checkpoint: v.optional(
    v.object({
      cursor: v.optional(v.string()),
      processedCount: v.number(),
      successCount: v.number(),
      errorCount: v.number(),
      lastProcessedId: v.optional(v.string()),
    }),
  ),
  totalRecords: v.optional(v.number()),
  processedRecords: v.number(),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  executedBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_migration_id", ["migrationId"])
  .index("by_status", ["status"])
  .index("by_phase", ["phase"]);

export const jobsTable = defineTable({
  userId: v.id("users"),
  type: v.union(
    v.literal("search"),
    v.literal("extractMemories"),
    v.literal("transcribe"),
    v.literal("embedFile"),
  ),
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled"),
  ),
  progress: v.optional(
    v.object({
      current: v.number(),
      message: v.string(),
      eta: v.optional(v.number()),
    }),
  ),
  input: v.any(),
  result: v.optional(v.any()),
  error: v.optional(
    v.object({
      message: v.string(),
      code: v.optional(v.string()),
      details: v.optional(v.any()),
    }),
  ),
  createdAt: v.number(),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  expiresAt: v.number(),
  retryCount: v.number(),
  metadata: v.optional(
    v.object({
      conversationId: v.optional(v.id("conversations")),
      fileId: v.optional(v.id("files")),
      cost: v.optional(v.number()),
    }),
  ),
})
  .index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"])
  .index("by_status_expires", ["status", "expiresAt"])
  .index("by_type_status", ["type", "status"])
  .index("by_expires", ["expiresAt"]);
