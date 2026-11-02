import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

function canonicalPair(a: Id<"memories">, b: Id<"memories">) {
  return a < b ? [a, b] : [b, a];
}

async function ensureOwnedMemory(
  ctx: MutationCtx,
  userId: Id<"users">,
  memoryId: Id<"memories">,
): Promise<Doc<"memories">> {
  const memory = await ctx.db.get(memoryId);
  if (!memory) throw new Error("Memory not found");
  if (memory.userId !== userId) throw new Error("Unauthorized");
  return memory;
}

async function getLinkedForMemory(
  ctx: QueryCtx,
  userId: Id<"users">,
  memoryId: Id<"memories">,
  minStrength: number,
): Promise<Array<{ memory: Doc<"memories">; strength: number }>> {
  const memory = await ctx.db.get(memoryId);
  if (!memory) return [];
  if (memory.userId !== userId) return [];

  const bySource = await ctx.db
    .query("memoryLinks")
    .withIndex("by_source_strength", (q) =>
      q.eq("sourceId", memoryId).gte("strength", minStrength),
    )
    .take(200);

  const byTargetAll = await ctx.db
    .query("memoryLinks")
    .withIndex("by_target", (q) => q.eq("targetId", memoryId))
    .take(200);
  const byTarget = byTargetAll.filter((l) => (l.strength ?? 0) >= minStrength);

  const links = [...bySource, ...byTarget];
  const out: Array<{ memory: Doc<"memories">; strength: number }> = [];

  for (const link of links) {
    const otherId = link.sourceId === memoryId ? link.targetId : link.sourceId;
    const other = await ctx.db.get(otherId);
    if (!other) continue;
    if (other.userId !== userId) continue;
    out.push({ memory: other, strength: link.strength });
  }

  return out;
}

export const createOrStrengthenLink = mutation({
  args: {
    sourceId: v.id("memories"),
    targetId: v.id("memories"),
    strength: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    await ensureOwnedMemory(ctx, user._id, args.sourceId);
    await ensureOwnedMemory(ctx, user._id, args.targetId);

    const [sourceId, targetId] = canonicalPair(args.sourceId, args.targetId);
    const now = Date.now();

    const existing = await ctx.db
      .query("memoryLinks")
      .withIndex("by_source", (q) => q.eq("sourceId", sourceId))
      .collect();

    const link = existing.find((l) => l.targetId === targetId);
    if (!link) {
      await ctx.db.insert("memoryLinks", {
        sourceId,
        targetId,
        strength: Math.max(0, Math.min(1, args.strength)),
        createdAt: now,
        updatedAt: now,
      });
      return null;
    }

    const newStrength = Math.min(1, (link.strength ?? 0) + args.strength);
    await ctx.db.patch(link._id, { strength: newStrength, updatedAt: now });
    return null;
  },
});

export const deleteLink = mutation({
  args: { sourceId: v.id("memories"), targetId: v.id("memories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    await ensureOwnedMemory(ctx, user._id, args.sourceId);
    await ensureOwnedMemory(ctx, user._id, args.targetId);

    const [sourceId, targetId] = canonicalPair(args.sourceId, args.targetId);

    const existing = await ctx.db
      .query("memoryLinks")
      .withIndex("by_source", (q) => q.eq("sourceId", sourceId))
      .collect();

    const link = existing.find((l) => l.targetId === targetId);
    if (link) await ctx.db.delete(link._id);
    return null;
  },
});

export const getLinkedMemories = query({
  args: { memoryId: v.id("memories"), minStrength: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const min = Math.max(0, Math.min(1, args.minStrength));
    return await getLinkedForMemory(ctx, user._id, args.memoryId, min);
  },
});

export const getLinkedMemoriesMultiple = query({
  args: { memoryIds: v.array(v.id("memories")), minStrength: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const min = Math.max(0, Math.min(1, args.minStrength));

    const ownedIds: Id<"memories">[] = [];
    for (const id of args.memoryIds) {
      const m = await ctx.db.get(id);
      if (m && m.userId === user._id) ownedIds.push(id);
    }

    const best = new Map<
      string,
      { memory: Doc<"memories">; strength: number }
    >();

    for (const id of ownedIds) {
      const linked = await getLinkedForMemory(ctx, user._id, id, min);
      for (const item of linked) {
        const existing = best.get(item.memory._id);
        if (!existing || item.strength > existing.strength) {
          best.set(item.memory._id, item);
        }
      }
    }

    return Array.from(best.values());
  },
});
