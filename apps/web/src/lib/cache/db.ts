import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import Dexie, { type Table } from "dexie";

/**
 * Local IndexedDB cache for instant reads.
 * Synced from Convex subscriptions, enables offline access.
 */
class BlahChatCache extends Dexie {
  conversations!: Table<Doc<"conversations">>;
  messages!: Table<Doc<"messages">>;
  notes!: Table<Doc<"notes">>;
  tasks!: Table<Doc<"tasks">>;
  projects!: Table<Doc<"projects">>;
  attachments!: Table<Doc<"attachments">>;
  toolCalls!: Table<Doc<"toolCalls">>;
  sources!: Table<Doc<"sources">>;
  pendingMutations!: Table<PendingMutation>;

  constructor() {
    super("blahchat-cache");

    // v1: Initial schema
    this.version(1).stores({
      conversations: "_id, userId, parentMessageId, updatedAt",
      messages: "_id, conversationId, createdAt",
      notes: "_id, userId, projectId, updatedAt",
      tasks: "_id, userId, projectId, status, deadline",
      projects: "_id, userId",
      attachments: "_id, messageId",
      toolCalls: "_id, messageId",
      sources: "_id, messageId",
      pendingMutations: "_id, type, createdAt",
    });

    // v2: Add _creationTime index for cleanup queries
    this.version(2).stores({
      conversations: "_id, userId, parentMessageId, updatedAt",
      messages: "_id, conversationId, createdAt",
      notes: "_id, userId, projectId, updatedAt",
      tasks: "_id, userId, projectId, status, deadline, _creationTime",
      projects: "_id, userId",
      attachments: "_id, messageId",
      toolCalls: "_id, messageId",
      sources: "_id, messageId",
      pendingMutations: "_id, type, createdAt",
    });

    // v3: Add projectId index for conversation filtering
    this.version(3).stores({
      conversations: "_id, userId, parentMessageId, updatedAt, projectId",
      messages: "_id, conversationId, createdAt",
      notes: "_id, userId, projectId, updatedAt",
      tasks: "_id, userId, projectId, status, deadline, _creationTime",
      projects: "_id, userId",
      attachments: "_id, messageId",
      toolCalls: "_id, messageId",
      sources: "_id, messageId",
      pendingMutations: "_id, type, createdAt",
    });
  }
}

/**
 * Pending mutation for offline queue
 */
export interface PendingMutation {
  _id: string;
  type: "sendMessage" | "editMessage" | "deleteMessage";
  payload: unknown;
  createdAt: number;
  retries: number;
}

// SSR guard: IndexedDB not available on server
let _cache: BlahChatCache | null = null;

function getCache(): BlahChatCache {
  if (typeof window === "undefined") {
    // Return a mock for SSR - will never be called in practice
    // since all cache usage is in "use client" components
    throw new Error(
      "Attempted to access IndexedDB cache during SSR. Ensure cache is only used in client components.",
    );
  }
  if (!_cache) {
    _cache = new BlahChatCache();
  }
  return _cache;
}

// Lazy-initialized cache singleton
export const cache =
  typeof window !== "undefined"
    ? getCache()
    : (null as unknown as BlahChatCache);
