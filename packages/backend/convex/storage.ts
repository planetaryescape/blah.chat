import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/userSync";

/**
 * Resolve an owned file only. A caller knowing a storage ID is not an
 * authorization grant; generated images are returned by their parent query.
 */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const file = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("storageId"), args.storageId))
      .first();
    if (!file) return null;
    return await ctx.storage.getUrl(args.storageId);
  },
});
