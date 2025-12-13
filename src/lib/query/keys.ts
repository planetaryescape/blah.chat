import type { Id } from "@/convex/_generated/dataModel";

export const queryKeys = {
  conversations: {
    all: ["conversations"] as const,
    lists: () => [...queryKeys.conversations.all, "list"] as const,
    detail: (id: Id<"conversations">) =>
      [...queryKeys.conversations.all, id] as const,
  },
  messages: {
    all: ["messages"] as const,
    list: (conversationId: Id<"conversations">) =>
      [...queryKeys.messages.all, conversationId] as const,
  },
  preferences: {
    all: ["preferences"] as const,
  },
} as const;
