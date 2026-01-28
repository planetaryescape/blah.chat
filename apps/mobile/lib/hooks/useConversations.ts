import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

export function useConversations() {
  return useQuery(api.conversations.list, {});
}

export function useConversation(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.conversations.get,
    conversationId ? { conversationId } : "skip",
  );
}

export function useCreateConversation() {
  return useMutation(api.conversations.create);
}

export function useUpdateModel() {
  return useMutation(api.conversations.updateModel);
}
