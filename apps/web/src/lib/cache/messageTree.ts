import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { BlahChatCache } from "./db";

// Only the complete authorized tree can identify deleted rows. An active page
// omits inactive siblings and unloaded history, neither of which is an orphan.
export async function syncMessageTree(
  cache: BlahChatCache,
  conversationId: Id<"conversations">,
  tree: Doc<"messages">[],
): Promise<void> {
  await cache.transaction("rw", cache.messages, async () => {
    const ids = new Set(tree.map((message) => message._id));
    const existing = await cache.messages
      .where("conversationId")
      .equals(conversationId)
      .toArray();
    await cache.messages.bulkDelete(
      existing
        .filter((message) => !ids.has(message._id))
        .map((message) => message._id),
    );
    await cache.messages.bulkPut(tree);
  });
}
