import { z } from "zod";
import {
  listConversationSources,
  listMessageSources,
} from "@/lib/persistence/sources";
import { formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

const listMessageSourcesSchema = z.object({
  messageIds: z.array(z.string().min(1)).max(200),
});

export const sourcesDAL = {
  listByMessage: async (clerkUserId: string, query: unknown) => {
    const validated = listMessageSourcesSchema.parse(query);
    const items = await listMessageSources(clerkUserId, validated);
    return formatEntityList(items, "source");
  },

  listByConversation: async (clerkUserId: string, conversationId: string) => {
    const items = await listConversationSources(clerkUserId, conversationId);
    return formatEntityList(items, "source");
  },
};
