import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { BlahChatCache } from "./db";

interface MessageMetadata {
  attachments?: Doc<"attachments">[];
  toolCalls?: Doc<"toolCalls">[];
  sources?: Doc<"sources">[];
}

export async function syncMessageMetadata(
  cache: BlahChatCache,
  metadata: MessageMetadata,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  await cache.transaction(
    "rw",
    [cache.messages, cache.attachments, cache.toolCalls, cache.sources],
    async () => {
      if (!isCurrent()) return;
      const messageIds = [
        ...new Set(
          [
            ...(metadata.attachments ?? []),
            ...(metadata.toolCalls ?? []),
            ...(metadata.sources ?? []),
          ].map((row) => row.messageId),
        ),
      ];
      const messages = await cache.messages.bulkGet(messageIds);
      if (!isCurrent()) return;
      const existingIds = new Set(
        messages.flatMap((message) => (message ? [message._id] : [])),
      );
      const attachments = metadata.attachments?.filter((row) =>
        existingIds.has(row.messageId),
      );
      const toolCalls = metadata.toolCalls?.filter((row) =>
        existingIds.has(row.messageId),
      );
      const sources = metadata.sources?.filter((row) =>
        existingIds.has(row.messageId),
      );
      if (attachments?.length) await cache.attachments.bulkPut(attachments);
      if (toolCalls?.length) await cache.toolCalls.bulkPut(toolCalls);
      if (sources?.length) await cache.sources.bulkPut(sources);
    },
  );
}

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
