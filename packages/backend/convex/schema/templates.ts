/**
 * Templates and Votes table module
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const templatesTable = defineTable({
  userId: v.optional(v.id("users")),
  name: v.string(),
  prompt: v.string(),
  description: v.optional(v.string()),
  category: v.string(),
  isBuiltIn: v.boolean(),
  isPublic: v.boolean(),
  usageCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_category", ["category", "isBuiltIn"])
  .searchIndex("search_templates", {
    searchField: "name",
    filterFields: ["userId", "isBuiltIn", "category"],
  });

export const votesTable = defineTable({
  userId: v.id("users"),
  comparisonGroupId: v.string(),
  winnerId: v.optional(v.id("messages")),
  rating: v.union(
    v.literal("left_better"),
    v.literal("right_better"),
    v.literal("tie"),
    v.literal("both_bad"),
  ),
  votedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_comparison", ["comparisonGroupId"]);
