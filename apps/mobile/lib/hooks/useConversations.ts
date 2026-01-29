import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

export function useConversations(projectId?: string | null) {
  return useQuery(api.conversations.list, {
    projectId:
      projectId === "none"
        ? "none"
        : projectId
          ? (projectId as Id<"projects">)
          : undefined,
  });
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
