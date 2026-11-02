/**
 * BYOK (Bring Your Own Key) table module
 * Main DB only - NOT included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userApiKeysTable = defineTable({
  userId: v.id("users"),
  byokEnabled: v.boolean(),
  encryptedVercelGatewayKey: v.optional(v.string()),
  encryptedOpenRouterKey: v.optional(v.string()),
  encryptedGroqKey: v.optional(v.string()),
  encryptedDeepgramKey: v.optional(v.string()),
  encryptionIVs: v.optional(v.string()),
  authTags: v.optional(v.string()),
  lastValidated: v.optional(
    v.object({
      vercelGateway: v.optional(v.number()),
      openRouter: v.optional(v.number()),
      groq: v.optional(v.number()),
      deepgram: v.optional(v.number()),
    }),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_user", ["userId"]);
