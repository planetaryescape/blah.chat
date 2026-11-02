"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex-helpers/react/cache";

/**
 * Invisible component that mounts Convex subscription to warm the cache.
 * ConvexQueryCacheProvider keeps subscriptions alive for 60s after unmount,
 * so the data will be ready when the user selects the note.
 */
export function NotePrefetcher({ noteId }: { noteId: Id<"notes"> }) {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  useQuery(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    api.notes.getNote,
    { noteId },
  );

  return null;
}
