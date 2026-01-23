/**
 * Cache tables module
 * Main DB only - NOT included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const cachedBibleVersesTable = defineTable({
  osis: v.string(),
  reference: v.string(),
  text: v.string(),
  version: v.string(),
  cachedAt: v.number(),
}).index("by_osis", ["osis"]);
