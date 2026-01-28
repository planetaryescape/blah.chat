import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

export function useMessages(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip",
  );
}

export function useSendMessage() {
  return useMutation(api.chat.sendMessage);
}
