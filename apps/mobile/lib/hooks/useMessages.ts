import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo } from "react";

export function useMessages(conversationId: Id<"conversations"> | null) {
  const allMessages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip",
  );

  // Filter to only show active branch messages
  return useMemo(() => {
    if (!allMessages) return allMessages;
    return allMessages.filter((m) => m.isActiveBranch !== false);
  }, [allMessages]);
}

export function useSendMessage() {
  return useMutation(api.chat.sendMessage);
}
