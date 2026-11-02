import { calculateRetention } from "@blah-chat/cognitive-memory";
import { internalMutation } from "../_generated/server";
import { logger } from "../lib/logger";

/**
 * One-time migration to backfill cognitive memory fields on existing memories.
 *
 * Usage:
 * 1. Deploy schema changes.
 * 2. Convex dashboard -> Functions
 * 3. Run: migrations/add_cognitive_memory_fields.migrate
 */
export const migrate = internalMutation({
  handler: async (ctx) => {
    const start = Date.now();
    const all = await ctx.db.query("memories").collect();

    logger.info("Found memories to backfill cognitive fields", {
      tag: "Migration",
      count: all.length,
    });

    let updated = 0;
    const batchSize = 100;

    for (let i = 0; i < all.length; i += batchSize) {
      const batch = all.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (memory) => {
          if (memory.memoryType !== undefined) return;

          const category = (memory.metadata?.category ?? "").toLowerCase();
          const memoryType =
            category.includes("event") || category.includes("conversation")
              ? "episodic"
              : category.includes("skill") || category.includes("how-to")
                ? "procedural"
                : "semantic";

          const stability = 0.3;
          const accessCount = 0;
          const lastAccessed = memory.createdAt;

          const retention = calculateRetention({
            stability,
            importance: (memory.metadata?.importance ?? 5) / 10,
            lastAccessed,
            memoryType,
          });

          await ctx.db.patch(memory._id, {
            memoryType,
            stability,
            accessCount,
            lastAccessed,
            retention,
            updatedAt: Date.now(),
          });

          updated++;
        }),
      );
    }

    const duration = Date.now() - start;

    logger.info("Backfilled cognitive fields on memories", {
      tag: "Migration",
      updated,
      total: all.length,
      durationSec: Math.round(duration / 1000),
    });

    return { updated, total: all.length, durationMs: duration };
  },
});

/**
 * Backfill script: recompute retention for memories that already have cognitive fields.
 */
export const backfillRetentionScores = internalMutation({
  handler: async (ctx) => {
    const start = Date.now();
    const all = await ctx.db.query("memories").collect();

    let updated = 0;
    const batchSize = 100;

    for (let i = 0; i < all.length; i += batchSize) {
      const batch = all.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (memory) => {
          if (memory.memoryType === undefined) return;

          const retention = calculateRetention({
            stability: memory.stability ?? 0.3,
            importance: (memory.metadata?.importance ?? 5) / 10,
            lastAccessed: memory.lastAccessed ?? memory.createdAt,
            memoryType: memory.memoryType,
          });

          if (Math.abs(retention - (memory.retention ?? 1.0)) <= 0.01) return;

          await ctx.db.patch(memory._id, { retention, updatedAt: Date.now() });
          updated++;
        }),
      );
    }

    const duration = Date.now() - start;
    return { updated, total: all.length, durationMs: duration };
  },
});
