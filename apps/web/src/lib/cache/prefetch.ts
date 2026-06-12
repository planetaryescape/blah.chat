import { cache } from "./db";

/**
 * Statuses for message rows that may carry client-side streaming state.
 * Mirrors the in-flight guard used by the message sync merge.
 */
const IN_FLIGHT_STATUSES = new Set(["pending", "generating"]);

/**
 * Minimal shape a prefetched row must expose for the merge guards.
 * Prefetch payloads come straight off the REST API, so the rest of the row
 * is passed through untouched.
 */
export type PrefetchableRow = {
  _id: string;
  updatedAt?: number;
  status?: string;
} & Record<string, unknown>;

/**
 * Write prefetched message rows without clobbering live local state.
 *
 * A prefetch snapshot can be older than what the active sync already has:
 * skip rows whose local counterpart is in a streaming/pending state or
 * carries a newer updatedAt, otherwise the raw bulkPut would overwrite
 * newer streamed content with a stale snapshot.
 */
export async function prefetchMessagesIntoCache(
  messages: PrefetchableRow[],
): Promise<void> {
  if (messages.length === 0) return;

  const existingRows = (await cache.messages.bulkGet(
    messages.map((message) => message._id),
  )) as Array<PrefetchableRow | undefined>;

  const writable = messages.filter((incoming, index) => {
    const existing = existingRows[index];
    if (!existing) return true;
    if (existing.status && IN_FLIGHT_STATUSES.has(existing.status)) {
      return false;
    }
    return (existing.updatedAt ?? 0) <= (incoming.updatedAt ?? 0);
  });

  if (writable.length > 0) {
    await cache.messages.bulkPut(writable);
  }
}

/**
 * Write a prefetched conversation row unless the local copy is newer.
 */
export async function prefetchConversationIntoCache(
  conversation: PrefetchableRow,
): Promise<void> {
  const existing = (await cache.conversations.get(conversation._id)) as
    | PrefetchableRow
    | undefined;
  if (existing && (existing.updatedAt ?? 0) > (conversation.updatedAt ?? 0)) {
    return;
  }
  await cache.conversations.put(conversation);
}
