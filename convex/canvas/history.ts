import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../lib/userSync";

// Get document history for undo/redo
export const getHistory = query({
  args: {
    documentId: v.id("canvasDocuments"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { documentId, limit = 50 }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) return [];

    return await ctx.db
      .query("canvasHistory")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .order("desc")
      .take(limit);
  },
});

// Get specific version
export const getVersion = query({
  args: {
    documentId: v.id("canvasDocuments"),
    version: v.number(),
  },
  handler: async (ctx, { documentId, version }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) return null;

    return await ctx.db
      .query("canvasHistory")
      .withIndex("by_document_version", (q) =>
        q.eq("documentId", documentId).eq("version", version),
      )
      .first();
  },
});
