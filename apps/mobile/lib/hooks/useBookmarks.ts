import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

export function useBookmarkByMessage(messageId: Id<"messages"> | null) {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  return useQuery(
    api.bookmarks.getByMessage,
    messageId ? { messageId } : "skip",
  );
}

export function useBookmarks() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  return useQuery(api.bookmarks.list);
}

export function useCreateBookmark() {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  return useMutation(api.bookmarks.create);
}

export function useUpdateBookmark() {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  return useMutation(api.bookmarks.update);
}

export function useRemoveBookmark() {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  return useMutation(api.bookmarks.remove);
}

export function useAddBookmarkTag() {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  return useMutation(api.bookmarks.addTag);
}

export function useRemoveBookmarkTag() {
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  return useMutation(api.bookmarks.removeTag);
}
