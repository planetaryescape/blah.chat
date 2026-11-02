import { v } from "convex/values";
import { query } from "./_generated/server";

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
