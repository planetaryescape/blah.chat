import { useApiClient } from "@/lib/api/client";
import { cache } from "@/lib/cache";

interface BulkConversationArgs {
  conversationIds: string[];
}

interface BulkConversationState {
  _id: string;
  pinned?: boolean;
  starred?: boolean;
}

interface RestConversation {
  _id: string;
  updatedAt?: number;
  title?: string | null;
  pinned?: boolean;
  starred?: boolean;
  archived?: boolean;
}

async function syncToggledConversations(
  execute: (conversationId: string) => Promise<RestConversation>,
  conversationIds: string[],
) {
  if (conversationIds.length === 0) {
    return [];
  }

  const updatedConversations = await Promise.all(
    conversationIds.map((conversationId) => execute(conversationId)),
  );

  await Promise.all(
    updatedConversations.map((conversation) =>
      cache.conversations.put(conversation as never),
    ),
  );

  return updatedConversations;
}

export function useBulkConversationCrud() {
  const api = useApiClient();

  return {
    async deleteMany({ conversationIds }: BulkConversationArgs) {
      if (conversationIds.length === 0) {
        return;
      }

      await Promise.all(
        conversationIds.map((conversationId) =>
          api.delete(`/api/v1/conversations/${conversationId}`),
        ),
      );
      await cache.conversations.bulkDelete(conversationIds);
    },

    async archiveMany({ conversationIds }: BulkConversationArgs) {
      if (conversationIds.length === 0) {
        return;
      }

      await Promise.all(
        conversationIds.map((conversationId) =>
          api.post(
            `/api/v1/conversations/${conversationId}/archive`,
            undefined,
          ),
        ),
      );
      await cache.conversations.bulkDelete(conversationIds);
    },

    async autoRenameMany({ conversationIds }: BulkConversationArgs) {
      if (conversationIds.length === 0) {
        return [];
      }

      const results = await Promise.all(
        conversationIds.map(async (conversationId) => {
          try {
            const updated = await api.post<RestConversation>(
              `/api/v1/conversations/${conversationId}/auto-rename`,
              undefined,
            );
            await cache.conversations.put(updated as never);

            return {
              id: conversationId,
              success: true,
              title: updated.title,
            };
          } catch (error) {
            return {
              id: conversationId,
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to auto-rename conversation",
            };
          }
        }),
      );

      return results;
    },

    async setPinned(
      conversations: BulkConversationState[],
      targetPinned: boolean,
    ) {
      const conversationIds = conversations
        .filter((conversation) => Boolean(conversation.pinned) !== targetPinned)
        .map((conversation) => conversation._id);

      return syncToggledConversations(
        (conversationId) =>
          api.post<RestConversation>(
            `/api/v1/conversations/${conversationId}/pin`,
            undefined,
          ),
        conversationIds,
      );
    },

    async setStarred(
      conversations: BulkConversationState[],
      targetStarred: boolean,
    ) {
      const conversationIds = conversations
        .filter(
          (conversation) => Boolean(conversation.starred) !== targetStarred,
        )
        .map((conversation) => conversation._id);

      return syncToggledConversations(
        (conversationId) =>
          api.post<RestConversation>(
            `/api/v1/conversations/${conversationId}/star`,
            undefined,
          ),
        conversationIds,
      );
    },
  };
}
