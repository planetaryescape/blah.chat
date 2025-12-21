import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

/**
 * Cascade delete all related records for a conversation.
 * Handles: bookmarks, shares, files (nullify), memories (nullify),
 * project junctions, participants, messages, and the conversation itself.
 */
export async function cascadeDeleteConversation(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  options?: { deleteMessages?: boolean; deleteConversation?: boolean },
): Promise<void> {
  const deleteMessages = options?.deleteMessages ?? true;
  const deleteConversation = options?.deleteConversation ?? true;

  // 1. Delete bookmarks
  const bookmarks = await ctx.db
    .query("bookmarks")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();
  for (const bookmark of bookmarks) {
    await ctx.db.delete(bookmark._id);
  }

  // 2. Delete shares
  const shares = await ctx.db
    .query("shares")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();
  for (const share of shares) {
    await ctx.db.delete(share._id);
  }

  // 3. Nullify files conversationId (files can exist independently)
  const files = await ctx.db
    .query("files")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();
  for (const file of files) {
    await ctx.db.patch(file._id, { conversationId: undefined });
  }

  // 4. Nullify memories conversationId (memories can exist independently)
  const memories = await ctx.db
    .query("memories")
    .filter((q) => q.eq(q.field("conversationId"), conversationId))
    .collect();
  for (const memory of memories) {
    await ctx.db.patch(memory._id, { conversationId: undefined });
  }

  // 5. Remove project junctions
  const junctions = await ctx.db
    .query("projectConversations")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();
  for (const junction of junctions) {
    await ctx.db.delete(junction._id);
  }

  // 6. Delete participants (for collaborative conversations)
  const participants = await ctx.db
    .query("conversationParticipants")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();
  for (const p of participants) {
    await ctx.db.delete(p._id);
  }

  // 7. Delete messages
  if (deleteMessages) {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  }

  // 8. Delete conversation
  if (deleteConversation) {
    await ctx.db.delete(conversationId);
  }
}
