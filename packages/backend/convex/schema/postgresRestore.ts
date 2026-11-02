import { defineTable } from "convex/server";
import { v } from "convex/values";

// Deliberately separate from application data. Never stores source row payloads.
export const postgresRestoreRuns = defineTable({
  namespace: v.string(),
  snapshotHash: v.string(),
  planHash: v.string(),
  expectedRows: v.number(),
  createdAt: v.number(),
}).index("by_namespace", ["namespace"]);

export const postgresRestoreRows = defineTable({
  namespace: v.string(),
  sourceTable: v.string(),
  sourceKey: v.string(),
  fingerprint: v.string(),
  targetTable: v.optional(v.string()),
  targetId: v.optional(v.string()),
  status: v.union(
    v.literal("inserted"),
    v.literal("imported"),
    v.literal("converted"),
    v.literal("blocked"),
    v.literal("retained"),
  ),
  reason: v.optional(v.string()),
  warnings: v.array(v.string()),
  updatedAt: v.number(),
})
  .index("by_source", ["namespace", "sourceTable", "sourceKey"])
  .index("by_namespace", ["namespace"]);
