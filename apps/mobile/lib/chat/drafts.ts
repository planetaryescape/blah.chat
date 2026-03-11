import {
  type ChatComposerDraftV1,
  deserializeDraftRecord,
  emptyDraft,
  isEmptyDraft,
  serializeDraftRecord,
  WEB_MOBILE_DRAFT_STORAGE_KEY,
} from "@blah-chat/chat-ui-core";
import { mmkvStorage } from "@/lib/cache/storage";

export function readChatDraft(
  conversationId: string,
): ChatComposerDraftV1 | null {
  const record = deserializeDraftRecord(
    mmkvStorage.getItem(WEB_MOBILE_DRAFT_STORAGE_KEY),
  );
  return record[conversationId] ?? null;
}

export function writeChatDraft(
  conversationId: string,
  update: Partial<ChatComposerDraftV1>,
) {
  const record = deserializeDraftRecord(
    mmkvStorage.getItem(WEB_MOBILE_DRAFT_STORAGE_KEY),
  );
  const next = {
    ...emptyDraft({ surfaceId: "mobile", conversationId }),
    ...record[conversationId],
    ...update,
    version: 1 as const,
    surfaceId: "mobile" as const,
    conversationId,
    updatedAt: Date.now(),
  };

  if (isEmptyDraft(next)) {
    delete record[conversationId];
  } else {
    record[conversationId] = next;
  }

  if (Object.keys(record).length === 0) {
    mmkvStorage.removeItem(WEB_MOBILE_DRAFT_STORAGE_KEY);
    return;
  }

  mmkvStorage.setItem(
    WEB_MOBILE_DRAFT_STORAGE_KEY,
    serializeDraftRecord(record),
  );
}

export function clearChatDraft(conversationId: string) {
  const record = deserializeDraftRecord(
    mmkvStorage.getItem(WEB_MOBILE_DRAFT_STORAGE_KEY),
  );
  delete record[conversationId];

  if (Object.keys(record).length === 0) {
    mmkvStorage.removeItem(WEB_MOBILE_DRAFT_STORAGE_KEY);
    return;
  }

  mmkvStorage.setItem(
    WEB_MOBILE_DRAFT_STORAGE_KEY,
    serializeDraftRecord(record),
  );
}
