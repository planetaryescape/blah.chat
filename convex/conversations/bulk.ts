import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { cascadeDeleteConversation } from "../lib/utils/cascade";
import { getCurrentUserOrCreate } from "../lib/userSync";

export const bulkDelete = mutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    for (const convId of args.conversationIds) {
      const conv = await ctx.db.get(convId);
      if (!conv || conv.userId !== user._id) {
        throw new Error("Unauthorized or not found");
      }

      await cascadeDeleteConversation(ctx, convId);
    }

    return { deletedCount: args.conversationIds.length };
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
