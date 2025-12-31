/**
 * Admin tables module
 * Main DB only - NOT included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const adminSettingsTable = defineTable({
  autoMemoryExtractEnabled: v.boolean(),
  autoMemoryExtractInterval: v.number(),
  enableHybridSearch: v.boolean(),
  defaultMonthlyBudget: v.number(),
  defaultBudgetAlertThreshold: v.number(),
  budgetHardLimitEnabled: v.boolean(),
  defaultDailyMessageLimit: v.number(),
  defaultDailyPresentationLimit: v.optional(v.number()),
  proModelsEnabled: v.optional(v.boolean()),
  tier1DailyProModelLimit: v.optional(v.number()),
  tier2MonthlyProModelLimit: v.optional(v.number()),
  alertEmail: v.string(),
  instanceId: v.optional(v.string()),
  transcriptProvider: v.optional(v.string()),
  transcriptCostPerMinute: v.optional(v.number()),
  updatedBy: v.id("users"),
  updatedAt: v.number(),
});

export const emailAlertsTable = defineTable({
  type: v.union(
    v.literal("budget_80_percent"),
    v.literal("budget_exceeded"),
    v.literal("api_credits_exhausted"),
  ),
  recipientEmail: v.string(),
  sentAt: v.number(),
  metadata: v.optional(
    v.object({
      budgetAmount: v.optional(v.number()),
      spentAmount: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
      modelId: v.optional(v.string()),
    }),
  ),
}).index("by_type_sent", ["type", "sentAt"]);

export const feedbackTable = defineTable({
  userId: v.id("users"),
  userEmail: v.string(),
  userName: v.string(),
  page: v.string(),
  feedbackType: v.union(
    v.literal("bug"),
    v.literal("feature"),
    v.literal("praise"),
    v.literal("other"),
  ),
  description: v.string(),
  whatTheyDid: v.optional(v.string()),
  whatTheySaw: v.optional(v.string()),
  whatTheyExpected: v.optional(v.string()),
  screenshotStorageId: v.optional(v.id("_storage")),
  status: v.union(
    v.literal("new"),
    v.literal("triaging"),
    v.literal("in-progress"),
    v.literal("resolved"),
    v.literal("verified"),
    v.literal("closed"),
    v.literal("wont-fix"),
    v.literal("duplicate"),
    v.literal("cannot-reproduce"),
    v.literal("submitted"),
    v.literal("under-review"),
    v.literal("planned"),
    v.literal("shipped"),
    v.literal("declined"),
    v.literal("maybe-later"),
    v.literal("received"),
    v.literal("acknowledged"),
    v.literal("shared"),
    v.literal("reviewed"),
    v.literal("actioned"),
  ),
  priority: v.optional(
    v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("none"),
    ),
  ),
  userSuggestedUrgency: v.optional(
    v.union(v.literal("urgent"), v.literal("normal"), v.literal("low")),
  ),
  tags: v.optional(v.array(v.string())),
  aiTriage: v.optional(
    v.object({
      suggestedPriority: v.string(),
      suggestedTags: v.array(v.string()),
      possibleDuplicateId: v.optional(v.id("feedback")),
      triageNotes: v.string(),
      createdAt: v.number(),
    }),
  ),
  assignedTo: v.optional(v.id("users")),
  archivedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_status", ["status"])
  .index("by_type", ["feedbackType"])
  .index("by_created", ["createdAt"])
  .index("by_priority", ["priority"])
  .index("by_assigned", ["assignedTo"])
  .index("by_status_priority", ["status", "priority"]);

// DEPRECATED: Phase 5 migrated to centralized tags table
export const feedbackTagsTable = defineTable({
  name: v.string(),
  color: v.optional(v.string()),
  usageCount: v.number(),
  createdAt: v.number(),
})
  .index("by_name", ["name"])
  .index("by_usage", ["usageCount"]);

export const feedbackTagJunctionsTable = defineTable({
  feedbackId: v.id("feedback"),
  tagId: v.id("tags"),
  userId: v.id("users"),
  createdAt: v.number(),
})
  .index("by_feedback", ["feedbackId"])
  .index("by_tag", ["tagId"])
  .index("by_user", ["userId"])
  .index("by_feedback_tag", ["feedbackId", "tagId"]);
