import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

function useInvalidateBookmarks() {
  const queryClient = useQueryClient();
  return (messageId?: string | null) => {
    queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    if (messageId) {
      queryClient.invalidateQueries({
        queryKey: ["bookmark-by-message", messageId],
      });
    }
  };
}

export function useCreateBookmark() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateBookmarks();

  return useMutation({
    mutationFn: (args: {
      messageId: string;
      conversationId: string;
      note?: string;
      tags?: string[];
    }) =>
      sdk.createBookmark({
        messageId: args.messageId,
        conversationId: args.conversationId,
        note: args.note,
        tags: args.tags,
      }),
    onSuccess: (data) => invalidate(data.messageId),
  });
}

export function useUpdateBookmark() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateBookmarks();

  return useMutation({
    mutationFn: (args: {
      bookmarkId: string;
      note?: string;
      tags?: string[];
    }) =>
      sdk.updateBookmark(args.bookmarkId, {
        note: args.note,
        tags: args.tags,
      }),
    onSuccess: (data) => invalidate(data.messageId),
  });
}

export function useRemoveBookmark() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateBookmarks();

  return useMutation({
    mutationFn: (args: { bookmarkId: string }) =>
      sdk.deleteBookmark(args.bookmarkId),
    onSuccess: () => invalidate(),
  });
}

export function useAddBookmarkTag() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateBookmarks();

  return useMutation({
    mutationFn: (args: { bookmarkId: string; tag: string }) =>
      sdk.addBookmarkTag(args.bookmarkId, args.tag),
    onSuccess: (data) => invalidate(data.messageId),
  });
}

export function useRemoveBookmarkTag() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateBookmarks();

  return useMutation({
    mutationFn: (args: { bookmarkId: string; tag: string }) =>
      sdk.removeBookmarkTag(args.bookmarkId, args.tag),
    onSuccess: (data) => invalidate(data.messageId),
  });
}
