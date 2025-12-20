import { embedMany } from "ai";
import { v } from "convex/values";
import { EMBEDDING_MODEL } from "@/lib/ai/operational-models";
import { mutation } from "../_generated/server";

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
    const embeddingResult = await embedMany({
      model: EMBEDDING_MODEL,
      values: [args.content],
    });

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

    console.log(
      `[Memory] Updated: v${existing.metadata?.version || 1} → v${(existing.metadata?.version || 1) + 1}`,
    );

    return newMemoryId;
  },
});
