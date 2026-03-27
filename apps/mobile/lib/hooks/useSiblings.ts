import { deriveMessageSiblings } from "@/lib/chat/messageTree";
import type { Id } from "@/lib/convex";
import { useMessageTree } from "./useMessages";

export function useSiblings(
  conversationId: Id<"conversations"> | undefined,
  messageId: Id<"messages"> | undefined,
) {
  const messages = useMessageTree(conversationId ?? null);
  if (!messageId || !messages) {
    return undefined;
  }

  return deriveMessageSiblings(messages, messageId);
}
