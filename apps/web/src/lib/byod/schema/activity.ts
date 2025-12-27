import { defineTable } from "convex/server";
import { v } from "convex/values";

export const activityTable = {
  activityEvents: defineTable({
    userId: v.string(),
    type: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"])
    .index("by_user_created", ["userId", "createdAt"]),
};
