import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get public URL for a storage item.
 * Used by slide preview to display generated images.
 * Ownership is verified at the slide query level (getSlides checks userId).
 */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
