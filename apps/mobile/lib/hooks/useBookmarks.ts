import type { Bookmark } from "@blah-chat/api-client";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/cache/queryClient";
import type { Id } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

function invalidateBookmarkQueries(messageId?: string | null) {
  queryClient.invalidateQueries({ queryKey: ["mobile", "bookmarks"] });

  if (!messageId) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey: ["mobile", "bookmark-by-message", messageId],
  });
}

export function useBookmarkByMessage(messageId: Id<"messages"> | null) {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["mobile", "bookmark-by-message", messageId],
    enabled: !!messageId,
    queryFn: async () => {
      if (!messageId) {
        return null;
      }

      const client = createMobileSdkClient(() => getToken());
      return client.getBookmarkByMessage(messageId);
    },
  });

  return query.data as Bookmark | null | undefined;
}

export function useBookmarks() {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["mobile", "bookmarks"],
    staleTime: 15_000,
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.listBookmarks();
    },
  });

  return query.data as Bookmark[] | undefined;
}

export function useCreateBookmark() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: {
      messageId: Id<"messages">;
      conversationId: Id<"conversations">;
      note?: string;
      tags?: string[];
    }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.createBookmark({
        messageId: args.messageId,
        conversationId: args.conversationId,
        note: args.note,
        tags: args.tags,
      });
    },
    onSuccess: (data) => {
      invalidateBookmarkQueries(data.messageId);
    },
  });

  return async (args: {
    messageId: Id<"messages">;
    conversationId: Id<"conversations">;
    note?: string;
    tags?: string[];
  }) => mutation.mutateAsync(args);
}

export function useUpdateBookmark() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: {
      bookmarkId: string;
      note?: string;
      tags?: string[];
    }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.updateBookmark(args.bookmarkId, {
        note: args.note,
        tags: args.tags,
      });
    },
    onSuccess: (data) => {
      invalidateBookmarkQueries(data.messageId);
    },
  });

  return async (args: { bookmarkId: string; note?: string; tags?: string[] }) =>
    mutation.mutateAsync(args);
}

export function useRemoveBookmark() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { bookmarkId: string }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.deleteBookmark(args.bookmarkId);
    },
    onSuccess: () => {
      invalidateBookmarkQueries();
    },
  });

  return async (args: { bookmarkId: string }) => mutation.mutateAsync(args);
}

export function useAddBookmarkTag() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { bookmarkId: string; tag: string }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.addBookmarkTag(args.bookmarkId, args.tag);
    },
    onSuccess: (data) => {
      invalidateBookmarkQueries(data.messageId);
    },
  });

  return async (args: { bookmarkId: string; tag: string }) =>
    mutation.mutateAsync(args);
}

export function useRemoveBookmarkTag() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { bookmarkId: string; tag: string }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.removeBookmarkTag(args.bookmarkId, args.tag);
    },
    onSuccess: (data) => {
      invalidateBookmarkQueries(data.messageId);
    },
  });

  return async (args: { bookmarkId: string; tag: string }) =>
    mutation.mutateAsync(args);
}
