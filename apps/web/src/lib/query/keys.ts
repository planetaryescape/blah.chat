export const queryKeys = {
  conversations: {
    all: ["conversations"] as const,
    lists: () => [...queryKeys.conversations.all, "list"] as const,
    detail: (id: string) => [...queryKeys.conversations.all, id] as const,
  },
  messages: {
    all: ["messages"] as const,
    list: (conversationId: string) =>
      [...queryKeys.messages.all, conversationId] as const,
  },
  preferences: {
    all: ["preferences"] as const,
  },
} as const;
