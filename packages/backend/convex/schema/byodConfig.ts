/**
 * BYOD Configuration tables module
 * Main DB only - NOT included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userDatabaseConfigTable = defineTable({
  userId: v.id("users"),
  encryptedDeploymentUrl: v.string(),
  encryptedDeployKey: v.string(),
  encryptionIV: v.string(),
  authTags: v.string(),
  connectionStatus: v.union(
    v.literal("pending"),
    v.literal("connected"),
    v.literal("error"),
    v.literal("disconnected"),
  ),
  lastConnectionTest: v.optional(v.number()),
  connectionError: v.optional(v.string()),
  schemaVersion: v.number(),
  lastSchemaDeploy: v.optional(v.number()),
  deploymentStatus: v.optional(
    v.union(
      v.literal("not_started"),
      v.literal("deploying"),
      v.literal("deployed"),
      v.literal("failed"),
    ),
  ),
  deploymentProgress: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_status", ["connectionStatus"]);

export const byodMigrationsTable = defineTable({
  userId: v.id("users"),
  migrationId: v.string(),
  version: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("skipped"),
  ),
  error: v.optional(v.string()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_migration", ["migrationId"])
  .index("by_user_migration", ["userId", "migrationId"])
  .index("by_status", ["status"]);
