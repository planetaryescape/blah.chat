/**
 * Users table module
 * Main DB only - NOT included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const usersTable = defineTable({
  clerkId: v.string(),
  email: v.string(),
  name: v.string(),
  imageUrl: v.optional(v.string()),
  isAdmin: v.optional(v.boolean()),
  dailyMessageCount: v.optional(v.number()),
  lastMessageDate: v.optional(v.string()),
  dailyPresentationCount: v.optional(v.number()),
  lastPresentationDate: v.optional(v.string()),
  tier: v.optional(
    v.union(v.literal("free"), v.literal("tier1"), v.literal("tier2")),
  ),
  dailyProModelCount: v.optional(v.number()),
  lastProModelDate: v.optional(v.string()),
  monthlyProModelCount: v.optional(v.number()),
  lastProModelMonth: v.optional(v.string()),
  disabledBuiltInTemplateIds: v.optional(v.array(v.id("templates"))),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"]);

export const userPreferencesTable = defineTable({
  userId: v.id("users"),
  category: v.union(
    v.literal("appearance"),
    v.literal("models"),
    v.literal("chat"),
    v.literal("audio"),
    v.literal("advanced"),
    v.literal("customInstructions"),
    v.literal("reasoning"),
    v.literal("memory"),
  ),
  key: v.string(),
  value: v.any(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_category", ["userId", "category"])
  .index("by_user_key", ["userId", "key"]);

export const userOnboardingTable = defineTable({
  userId: v.id("users"),
  tourCompleted: v.boolean(),
  tourCompletedAt: v.optional(v.number()),
  tourSkipped: v.boolean(),
  tourSkippedAt: v.optional(v.number()),
  tourStep: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_user", ["userId"]);

export const dismissedHintsTable = defineTable({
  userId: v.id("users"),
  featureId: v.string(),
  dismissedAt: v.number(),
  viewCount: v.number(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_feature", ["userId", "featureId"]);

export const userStatsTable = defineTable({
  userId: v.id("users"),
  totalMessages: v.number(),
  totalConversations: v.number(),
  totalSearches: v.number(),
  totalBookmarks: v.number(),
  longMessageCount: v.number(),
  messagesInCurrentConvo: v.number(),
  consecutiveSearches: v.number(),
  promptPatternCount: v.any(),
  lastUpdated: v.number(),
}).index("by_user", ["userId"]);

export const userRankingsTable = defineTable({
  userId: v.id("users"),
  date: v.string(),
  overallPercentile: v.number(),
  modelRankings: v.array(
    v.object({
      model: v.string(),
      percentile: v.number(),
      totalUsers: v.number(),
    }),
  ),
  totalActiveUsers: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "date"]);
