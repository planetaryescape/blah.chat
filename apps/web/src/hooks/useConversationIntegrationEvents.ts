"use client";

import { useQuery } from "@tanstack/react-query";

export interface ConversationIntegrationEvent {
  _id: string;
  conversationId: string;
  integrationId: string;
  integrationName: string;
  action: "enabled" | "disabled";
  source: string;
  createdAt: number;
  _creationTime: number;
}

export function useConversationIntegrationEvents(
  conversationId?: string | null,
) {
  return useQuery({
    queryKey: ["conversation-integration-events", conversationId],
    queryFn: async () => {
      if (!conversationId) {
        return [] as ConversationIntegrationEvent[];
      }

      const response = await fetch(
        `/api/v1/conversations/${conversationId}/integration-events`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch integration events");
      }

      const payload = (await response.json()) as Array<{
        data?: ConversationIntegrationEvent;
      }>;

      return payload.flatMap((item) => (item?.data ? [item.data] : []));
    },
    enabled: !!conversationId,
    staleTime: 10_000,
  });
}
