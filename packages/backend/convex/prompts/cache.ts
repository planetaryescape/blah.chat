/**
 * Prompt Cache - Stub Module
 *
 * TODO: Implement prompt caching functionality
 * This is a stub to satisfy references from other modules.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { logger } from "../lib/logger";

/**
 * Build and cache a system prompt for a conversation
 * TODO: Implement actual caching logic
 */
export const buildAndCachePrompt = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    modelId: v.string(),
  },
  handler: async (_ctx, _args) => {
    // Stub - no-op for now
    logger.info("buildAndCachePrompt called (stub)", { tag: "PromptCache" });
  },
});

/**
 * Rebuild prompts for a user across all their conversations
 * TODO: Implement actual rebuild logic
 */
export const rebuildUserPrompts = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (_ctx, _args) => {
    // Stub - no-op for now
    logger.info("rebuildUserPrompts called (stub)", { tag: "PromptCache" });
  },
});
