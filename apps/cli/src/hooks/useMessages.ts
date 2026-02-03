import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { Message } from "../lib/queries.js";
import { useConvexSubscription } from "./useConvexSubscription.js";

export function useMessages(conversationId: () => Id<"conversations">) {
  return useConvexSubscription<Message[] | null>(
    api.cliAuth.listMessages,
    () => ({
      conversationId: conversationId(),
    }),
  );
}
