/**
 * CLI API Keys table module
 * Main DB only - NOT included in BYOD schema
 *
 * Stores hashed API keys for CLI authentication.
 * Keys never expire unless explicitly revoked.
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const cliApiKeysTable = defineTable({
  userId: v.id("users"),
  keyHash: v.string(), // SHA-256 hash (plaintext never stored)
  keyPrefix: v.string(), // First 12 chars for display: "blah_abc1..."
  name: v.string(), // Auto: "CLI Login - Dec 31, 2025"
  lastUsedAt: v.optional(v.number()),
  createdAt: v.number(),
  revokedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_key_hash", ["keyHash"]);
