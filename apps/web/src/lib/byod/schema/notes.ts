import { defineTable } from "convex/server";
import { v } from "convex/values";

export const notesTable = {
  notes: defineTable({
    userId: v.string(),
    title: v.string(),
    content: v.string(), // Markdown
    isPinned: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_pinned", ["userId", "isPinned"])
    .index("by_user_archived", ["userId", "isArchived"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    }),
};
