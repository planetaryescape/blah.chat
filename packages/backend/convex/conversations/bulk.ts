import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation, mutation } from "../_generated/server";
import { getCurrentUserOrCreate } from "../lib/userSync";
import { cascadeDeleteConversation } from "../lib/utils/cascade";

export const deleteOneInternal = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await cascadeDeleteConversation(ctx, args.conversationId);
  },
});

export const bulkDelete = action({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.users._getUserByClerkIdInternal,
      { clerkId: identity.subject },
    )) as { _id: string } | null;
    if (!user) throw new Error("User not found");

    for (const convId of args.conversationIds) {
      const conv = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.conversations.internal.getInternal,
        { id: convId },
      )) as { userId: string } | null;
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }
    }

    for (const convId of args.conversationIds) {
      await ctx.scheduler.runAfter(
        0,
        internal.conversations.bulk.deleteOneInternal,
        { conversationId: convId },
      );
    }

    return { deletedCount: args.conversationIds.length, scheduled: true };
  },
});

export const bulkArchive = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        archived: true,
        updatedAt: Date.now(),
      });
    }

    return { archivedCount: args.conversationIds.length };
  },
});

export const bulkPin = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        pinned: true,
        updatedAt: Date.now(),
      });
    }

    return { pinnedCount: args.conversationIds.length };
  },
});

export const bulkUnpin = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        pinned: false,
        updatedAt: Date.now(),
      });
    }

    return { unpinnedCount: args.conversationIds.length };
  },
});

export const bulkStar = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        starred: true,
        updatedAt: Date.now(),
      });
    }

    return { starredCount: args.conversationIds.length };
  },
});

export const bulkUnstar = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await ctx.db.patch(convId, {
        starred: false,
        updatedAt: Date.now(),
      });
    }

    return { unstarredCount: args.conversationIds.length };
  },
});
