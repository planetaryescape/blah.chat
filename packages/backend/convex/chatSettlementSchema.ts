import { defineTable } from "convex/server";
import { v } from "convex/values";

// Hosted accounting metadata, deliberately outside the portable BYOD modules.

export const agentRunsTable = defineTable({
  ownerUserId: v.id("users"),
  conversationId: v.optional(v.id("conversations")),
  messageId: v.optional(v.id("messages")),
  createdAt: v.number(),
  ownerErasedAt: v.optional(v.number()),
})
  .index("by_message", ["messageId"])
  .index("by_conversation", ["conversationId"])
  .index("by_owner", ["ownerUserId"]);

export const runAttemptsTable = defineTable({
  runId: v.id("agentRuns"),
  ownerUserId: v.id("users"),
  model: v.string(),
  isByok: v.literal(false),
  provider: v.optional(v.string()),
  pricing: v.optional(
    v.object({
      input: v.number(),
      output: v.number(),
      cached: v.optional(v.number()),
      reasoning: v.optional(v.number()),
      tiers: v.optional(
        v.array(
          v.object({
            minInputTokens: v.number(),
            input: v.optional(v.number()),
            output: v.optional(v.number()),
            cached: v.optional(v.number()),
            reasoning: v.optional(v.number()),
          }),
        ),
      ),
    }),
  ),
  pricingVersion: v.optional(v.string()),
  attemptIndex: v.number(),
  status: v.union(
    v.literal("dispatching"),
    v.literal("complete"),
    v.literal("stopped"),
    v.literal("error"),
  ),
  createdAt: v.number(),
  finishedAt: v.optional(v.number()),
})
  .index("by_run_index", ["runId", "attemptIndex"])
  .index("by_run", ["runId"])
  .index("by_owner", ["ownerUserId"]);

export const usageEventsTable = defineTable({
  attribution: v.object({
    kind: v.literal("run"),
    runId: v.id("agentRuns"),
    attemptId: v.id("runAttempts"),
  }),
  runId: v.id("agentRuns"),
  attemptId: v.id("runAttempts"),
  ownerUserId: v.id("users"),
  conversationId: v.optional(v.id("conversations")),
  model: v.string(),
  feature: v.literal("chat"),
  operationType: v.literal("text"),
  stepIndex: v.number(),
  iterationKind: v.union(v.literal("main"), v.literal("continuation")),
  dispatchRequestHash: v.string(),
  usageKey: v.string(),
  evidenceKey: v.string(),
  sourceEvidenceHash: v.optional(v.string()),
  evidenceKind: v.union(
    v.literal("dispatch"),
    v.literal("reported"),
    v.literal("estimated"),
  ),
  isByok: v.literal(false),
  provider: v.optional(v.string()),
  pricingVersion: v.optional(v.string()),
  correctsUsageEventId: v.optional(v.id("usageEvents")),
  measurement: v.union(
    v.literal("reported"),
    v.literal("estimated"),
    v.literal("unknown"),
  ),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  cachedInputTokens: v.optional(v.number()),
  cacheWriteTokens: v.optional(v.number()),
  reasoningTokens: v.optional(v.number()),
  costUsd: v.optional(v.number()),
  currency: v.literal("USD"),
  rateVersion: v.optional(v.string()),
  occurredAt: v.number(),
  dispatchAt: v.optional(v.number()),
})
  .index("by_evidence_key", ["evidenceKey"])
  .index("by_usage_key", ["usageKey"])
  .index("by_attempt_step", ["attemptId", "stepIndex"])
  .index("by_run", ["runId"])
  .index("by_owner", ["ownerUserId"]);

export const chatUsageProjectionsTable = defineTable({
  ownerUserId: v.id("users"),
  date: v.string(),
  conversationId: v.optional(v.id("conversations")),
  model: v.string(),
  feature: v.literal("chat"),
  operationType: v.literal("text"),
  isByok: v.literal(false),
  runId: v.id("agentRuns"),
  usageRecordId: v.id("usageRecords"),
  inputTokens: v.number(),
  outputTokens: v.number(),
  cachedInputTokens: v.number(),
  cacheWriteTokens: v.number(),
  reasoningTokens: v.number(),
  messageCount: v.number(),
  costUsd: v.number(),
  hasUnknownCost: v.boolean(),
  hasUnknownUsage: v.boolean(),
  measurement: v.union(
    v.literal("reported"),
    v.literal("estimated"),
    v.literal("unknown"),
  ),
  updatedAt: v.number(),
})
  .index("by_run", ["runId"])
  .index("by_usage_record", ["usageRecordId"])
  .index("by_owner_date_model_conversation", [
    "ownerUserId",
    "date",
    "model",
    "conversationId",
  ])
  .index("by_conversation", ["conversationId"])
  .index("by_owner", ["ownerUserId"]);
