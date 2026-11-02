"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache";
import { useEffect } from "react";
import { useUserCache } from "@/lib/cache/context";

/**
 * Invisible component that mounts Convex subscriptions to warm the cache.
 * ConvexQueryCacheProvider keeps subscriptions alive for 60s after unmount,
 * so the data will be ready when the user navigates to the conversation.
 * Also syncs messages to Dexie for instant local access.
 */
export function ConversationPrefetcher({
  conversationId,
}: {
  conversationId: Id<"conversations">;
}) {
  const cache = useUserCache();
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  useQuery(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    api.conversations.get,
    { conversationId },
  );

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const { results } = usePaginatedQuery(
    api.messages.listPaginated,
    { conversationId },
    { initialNumItems: 50 },
  );

  // Sync prefetched messages to Dexie for instant access
  useEffect(() => {
    if (results?.length) {
      cache.messages.bulkPut(results).catch(console.error);
    }
  }, [cache, results]);

  return null;
}
