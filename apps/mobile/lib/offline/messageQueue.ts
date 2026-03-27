import { storage } from "@/lib/cache/storage";

const MESSAGE_QUEUE_KEY = "mobile:message-queue:v1";
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;

export type OfflineAttachmentInput = {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
};

export type QueuedConversationDraft = {
  model: string;
  title?: string;
  systemPrompt?: string;
};

export type QueuedSendPayload = {
  content: string;
  modelId?: string;
  models?: string[];
  parentMessageId?: string;
  clientMessageId: string;
  thinkingEffort?: "none" | "low" | "medium" | "high";
  attachments?: OfflineAttachmentInput[];
};

export type QueuedSendRecord = {
  id: string;
  conversationId?: string;
  localConversationId?: string;
  createConversation?: QueuedConversationDraft;
  payload: QueuedSendPayload;
  status: "queued" | "sending";
  retryCount: number;
  createdAt: number;
  updatedAt: number;
  nextRetryAt: number;
};

export type KeyValueStorage = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove?(key: string): void;
};

export type ReplayMessageQueueOptions = {
  createConversation: (
    draft: QueuedConversationDraft,
  ) => Promise<{ _id?: string; conversationId?: string }>;
  sendMessage: (
    conversationId: string,
    payload: QueuedSendPayload,
  ) => Promise<unknown>;
  onConversationReconciled?: (input: {
    localConversationId: string;
    conversationId: string;
    clientMessageId: string;
  }) => void | Promise<void>;
  now?: () => number;
};

type ReplayResult = {
  sent: Array<{ recordId: string; conversationId: string }>;
};

function parseQueue(value: string | undefined): QueuedSendRecord[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as QueuedSendRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function generateRecordId() {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `queued-send-${random}`;
}

function calculateNextRetryAt(now: number, retryCount: number) {
  return now + Math.min(INITIAL_BACKOFF_MS * 2 ** retryCount, MAX_BACKOFF_MS);
}

export function createMemoryKeyValueStorage(): KeyValueStorage {
  const map = new Map<string, string>();

  return {
    getString(key) {
      return map.get(key);
    },
    set(key, value) {
      map.set(key, value);
    },
    remove(key) {
      map.delete(key);
    },
  };
}

export function createMobileMessageQueue(
  keyValueStorage: KeyValueStorage = storage,
) {
  const read = () => parseQueue(keyValueStorage.getString(MESSAGE_QUEUE_KEY));

  const write = (records: QueuedSendRecord[]) => {
    if (records.length === 0 && keyValueStorage.remove) {
      keyValueStorage.remove(MESSAGE_QUEUE_KEY);
      return;
    }

    keyValueStorage.set(MESSAGE_QUEUE_KEY, JSON.stringify(records));
  };

  const updateRecord = (
    recordId: string,
    apply: (record: QueuedSendRecord) => QueuedSendRecord,
  ) => {
    const next = read().map((record) =>
      record.id === recordId ? apply(record) : record,
    );
    write(next);
    return next.find((record) => record.id === recordId);
  };

  return {
    list(): QueuedSendRecord[] {
      return read().sort((left, right) => left.createdAt - right.createdAt);
    },

    enqueueSend(input: {
      conversationId?: string;
      localConversationId?: string;
      createConversation?: QueuedConversationDraft;
      content: string;
      modelId?: string;
      models?: string[];
      parentMessageId?: string;
      clientMessageId: string;
      thinkingEffort?: "none" | "low" | "medium" | "high";
      attachments?: OfflineAttachmentInput[];
      createdAt?: number;
    }) {
      const now = input.createdAt ?? Date.now();
      const record: QueuedSendRecord = {
        id: generateRecordId(),
        conversationId: input.conversationId,
        localConversationId: input.localConversationId,
        createConversation: input.createConversation,
        payload: {
          content: input.content,
          modelId: input.modelId,
          models: input.models,
          parentMessageId: input.parentMessageId,
          clientMessageId: input.clientMessageId,
          thinkingEffort: input.thinkingEffort,
          attachments: input.attachments,
        },
        status: "queued",
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
        nextRetryAt: now,
      };

      write([...read(), record]);
      return record;
    },

    clear() {
      write([]);
    },

    async replay(options: ReplayMessageQueueOptions): Promise<ReplayResult> {
      const now = options.now ?? Date.now;
      const sent: ReplayResult["sent"] = [];
      const resolvedConversationIds = new Map<string, string>();

      for (const record of this.list()) {
        if (record.nextRetryAt > now()) {
          continue;
        }

        updateRecord(record.id, (current) => ({
          ...current,
          status: "sending",
          updatedAt: now(),
        }));

        try {
          let conversationId = record.conversationId;

          if (!conversationId && record.localConversationId) {
            conversationId = resolvedConversationIds.get(
              record.localConversationId,
            );
          }

          if (!conversationId) {
            if (!record.localConversationId || !record.createConversation) {
              throw new Error("Queued record is missing conversation context");
            }

            const created = await options.createConversation(
              record.createConversation,
            );
            conversationId = created._id ?? created.conversationId;
            if (!conversationId) {
              throw new Error("Conversation creation did not return an id");
            }

            resolvedConversationIds.set(
              record.localConversationId,
              conversationId,
            );

            if (options.onConversationReconciled) {
              await options.onConversationReconciled({
                localConversationId: record.localConversationId,
                conversationId,
                clientMessageId: record.payload.clientMessageId,
              });
            }
          }

          await options.sendMessage(conversationId, record.payload);
          if (record.localConversationId) {
            resolvedConversationIds.set(
              record.localConversationId,
              conversationId,
            );
          }

          write(read().filter((current) => current.id !== record.id));
          sent.push({ recordId: record.id, conversationId });
        } catch {
          updateRecord(record.id, (current) => {
            const retryCount = current.retryCount + 1;
            const updatedAt = now();
            return {
              ...current,
              status: "queued",
              retryCount,
              updatedAt,
              nextRetryAt: calculateNextRetryAt(updatedAt, retryCount - 1),
            };
          });
        }
      }

      return { sent };
    },
  };
}

export const mobileMessageQueue = createMobileMessageQueue();
