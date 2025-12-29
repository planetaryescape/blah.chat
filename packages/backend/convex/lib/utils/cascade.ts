import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

/**
 * Cascade delete all related records for a conversation.
 * Handles: bookmarks, shares, files (nullify), memories (nullify),
 * project junctions, participants, tokenUsage, attachments, toolCalls,
 * sources, canvasDocuments, canvasHistory, presentations (nullify),
 * messages, and the conversation itself.
 */
export async function cascadeDeleteConversation(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  options?: { deleteMessages?: boolean; deleteConversation?: boolean },
): Promise<void> {
  const deleteMessages = options?.deleteMessages ?? true;
  const deleteConversation = options?.deleteConversation ?? true;

  // Parallel queries for all related records
  const [
    bookmarks,
    shares,
    files,
    memories,
    junctions,
    participants,
    tokenUsage,
    attachments,
    toolCalls,
    sources,
    canvasDocs,
    presentations,
  ] = await Promise.all([
    ctx.db
      .query("bookmarks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("shares")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("files")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("memories")
      .filter((q) => q.eq(q.field("conversationId"), conversationId))
      .collect(),
    ctx.db
      .query("projectConversations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("attachments")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("toolCalls")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("sources")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("canvasDocuments")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("presentations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
  ]);

  // Parallel deletions for independent tables
  await Promise.all([
    ...bookmarks.map((b) => ctx.db.delete(b._id)),
    ...shares.map((s) => ctx.db.delete(s._id)),
    ...junctions.map((j) => ctx.db.delete(j._id)),
    ...participants.map((p) => ctx.db.delete(p._id)),
    ...tokenUsage.map((t) => ctx.db.delete(t._id)),
    ...attachments.map((a) => ctx.db.delete(a._id)),
    ...toolCalls.map((tc) => ctx.db.delete(tc._id)),
    ...sources.map((src) => ctx.db.delete(src._id)),
  ]);

  // Nullify files/memories (can exist independently)
  await Promise.all([
    ...files.map((f) => ctx.db.patch(f._id, { conversationId: undefined })),
    ...memories.map((m) => ctx.db.patch(m._id, { conversationId: undefined })),
    ...presentations.map((p) =>
      ctx.db.patch(p._id, { conversationId: undefined }),
    ),
  ]);

  // Canvas docs have history children - must delete history first
  for (const doc of canvasDocs) {
    const history = await ctx.db
      .query("canvasHistory")
      .withIndex("by_document", (q) => q.eq("documentId", doc._id))
      .collect();
    await Promise.all(history.map((h) => ctx.db.delete(h._id)));
    await ctx.db.delete(doc._id);
  }

  if (deleteMessages) {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    await Promise.all(messages.map((msg) => ctx.db.delete(msg._id)));
  }

  if (deleteConversation) await ctx.db.delete(conversationId);
}
