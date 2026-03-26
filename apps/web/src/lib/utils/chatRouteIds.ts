const LEGACY_DOCUMENT_ID_PATTERN = /^[a-z0-9]+$/;

export function isLegacyDocumentId(
  id: string | null | undefined,
): id is string {
  return !!id && LEGACY_DOCUMENT_ID_PATTERN.test(id);
}

export function isLegacyConversationId(
  conversationId: string | null | undefined,
): conversationId is string {
  return isLegacyDocumentId(conversationId);
}

export function isLegacyMessageId(
  messageId: string | null | undefined,
): messageId is string {
  return isLegacyDocumentId(messageId);
}

export function getLegacyConversationIdFromPath(
  pathname: string | null | undefined,
): string | null {
  if (!pathname?.startsWith("/chat/")) {
    return null;
  }

  const conversationId = pathname.split("/")[2];
  if (!conversationId) {
    return null;
  }

  return isLegacyConversationId(conversationId) ? conversationId : null;
}
