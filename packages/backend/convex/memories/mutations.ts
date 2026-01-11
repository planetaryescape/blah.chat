import { embedMany } from "ai";
import { v } from "convex/values";
import {
  calculateEmbeddingCost,
  EMBEDDING_MODEL,
  EMBEDDING_PRICING,
} from "@/lib/ai/operational-models";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { logger } from "../lib/logger";
import { estimateTokens } from "../tokens/counting";

export const updateMemory = mutation({
  args: {
    id: v.id("memories"),
    content: v.string(),
    metadata: v.optional(
      v.object({
        category: v.optional(v.string()),
        importance: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Memory not found");

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || existing.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Generate new embedding for updated content
    const tokenCount = estimateTokens(args.content);
    const embeddingResult = await embedMany({
      model: EMBEDDING_MODEL,
      values: [args.content],
    });

    // Track embedding cost
    await ctx.scheduler.runAfter(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.usage.mutations.recordEmbedding,
      {
        userId: user._id,
        model: EMBEDDING_PRICING.model,
        tokenCount,
        cost: calculateEmbeddingCost(tokenCount),
        feature: "memory",
      },
    );

    // Create new version
    const newMemoryId = await ctx.db.insert("memories", {
      userId: existing.userId,
      content: args.content,
      embedding: embeddingResult.embeddings[0],
      metadata: {
        ...existing.metadata,
        ...args.metadata,
        version: (existing.metadata?.version || 1) + 1,
        confidence: 1.0, // Manual edit = verified
        verifiedBy: "manual",
        extractedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mark old version as superseded
    await ctx.db.patch(args.id, {
      metadata: {
        ...existing.metadata,
        supersededBy: newMemoryId,
      },
    });

    logger.info("Memory updated", {
      tag: "Memory",
      oldVersion: existing.metadata?.version || 1,
      newVersion: (existing.metadata?.version || 1) + 1,
    });

    return newMemoryId;
  },
});
