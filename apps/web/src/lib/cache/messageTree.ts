import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { BlahChatCache } from "./db";

// Only the complete authorized tree can identify deleted rows. An active page
// omits inactive siblings and unloaded history, neither of which is an orphan.
export async function syncMessageTree(
  cache: BlahChatCache,
  conversationId: Id<"conversations">,
  tree: Doc<"messages">[],
): Promise<void> {
  await cache.transaction(
    "rw",
    [cache.messages, cache.attachments, cache.toolCalls, cache.sources],
    async () => {
      const ids = new Set(tree.map((message) => message._id));
      const existing = await cache.messages
        .where("conversationId")
        .equals(conversationId)
        .toArray();
      const deletedIds = existing
        .filter((message) => !ids.has(message._id))
        .map((message) => message._id);
      if (deletedIds.length) {
        await cache.messages.bulkDelete(deletedIds);
        await cache.attachments.where("messageId").anyOf(deletedIds).delete();
        await cache.toolCalls.where("messageId").anyOf(deletedIds).delete();
        await cache.sources.where("messageId").anyOf(deletedIds).delete();
      }

      // Convex documents are JSON values. Compare the full row, not updatedAt:
      // streamed partial content and branch flags can change independently.
      const byId = new Map(existing.map((message) => [message._id, message]));
      const changed = tree.filter((message) => {
        const previous = byId.get(message._id);
        return (
          !previous || JSON.stringify(previous) !== JSON.stringify(message)
        );
      });
      if (changed.length) await cache.messages.bulkPut(changed);
    },
  );
}
