"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache";

/**
 * Invisible component that mounts Convex subscriptions to warm the cache.
 * ConvexQueryCacheProvider keeps subscriptions alive for 60s after unmount,
 * so the data will be ready when the user navigates to the conversation.
 */
export function ConversationPrefetcher({
  conversationId,
}: {
  conversationId: Id<"conversations">;
}) {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  useQuery(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    api.conversations.get,
    { conversationId },
  );

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  usePaginatedQuery(
    api.messages.listPaginated,
    { conversationId },
    { initialNumItems: 50 },
  );

  return null;
}
