"use client";

import { useQuery } from "convex-helpers/react/cache";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
