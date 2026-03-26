const CONVEX_DOCUMENT_ID_PATTERN = /^[a-z0-9]+$/;

export function isConvexDocumentId(
  id: string | null | undefined,
): id is string {
  return !!id && CONVEX_DOCUMENT_ID_PATTERN.test(id);
}

export function isConvexConversationId(
  conversationId: string | null | undefined,
): conversationId is string {
  return isConvexDocumentId(conversationId);
}

export function isConvexMessageId(
  messageId: string | null | undefined,
): messageId is string {
  return isConvexDocumentId(messageId);
}

export function getConvexConversationIdFromPath(
  pathname: string | null | undefined,
): string | null {
  if (!pathname?.startsWith("/chat/")) {
    return null;
  }

  const conversationId = pathname.split("/")[2];
  if (!conversationId) {
    return null;
  }

  return isConvexConversationId(conversationId) ? conversationId : null;
}
