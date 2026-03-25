import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

export function useBookmarks() {
  const sdk = useSDKClient();

  return useQuery({
    queryKey: ["bookmarks"],
    staleTime: 15_000,
    queryFn: () => sdk.listBookmarks(),
  });
}

export function useBookmarkByMessage(messageId: string | null) {
  const sdk = useSDKClient();

  return useQuery({
    queryKey: ["bookmark-by-message", messageId],
    enabled: !!messageId && !messageId.startsWith("temp-"),
    queryFn: () => sdk.getBookmarkByMessage(messageId!),
  });
}
