import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import Dexie, { type Table } from "dexie";

/**
 * Cached user preferences (single record storing all preferences)
 */
export interface CachedPreferences {
  _id: string; // Always 'current'
  data: Record<string, unknown>;
}

/**
 * Local IndexedDB cache for instant reads.
 * Synced from Convex subscriptions, enables offline access.
 */
export class BlahChatCache extends Dexie {
  conversations!: Table<Doc<"conversations">>;
  messages!: Table<Doc<"messages">>;
  notes!: Table<Doc<"notes">>;
  tasks!: Table<Doc<"tasks">>;
  projects!: Table<Doc<"projects">>;
  attachments!: Table<Doc<"attachments">>;
  toolCalls!: Table<Doc<"toolCalls">>;
  sources!: Table<Doc<"sources">>;
  pendingMutations!: Table<PendingMutation>;
  userPreferences!: Table<CachedPreferences>;

  constructor(userId: string) {
    // Deployment IDs are not portable. Keep the previous Postgres/deleted-Convex
    // cache intact, but never replay its queued writes into a new deployment.
    const deployment = process.env.NEXT_PUBLIC_CONVEX_URL
      ? encodeURIComponent(new URL(process.env.NEXT_PUBLIC_CONVEX_URL).origin)
      : "unconfigured";
    // Never open the legacy deployment-only database: it has no trusted owner.
    super(
      `blahchat-cache-convex-${deployment}-user-${encodeURIComponent(userId)}`,
    );

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

    // v4: Add userPreferences cache for instant reads
    this.version(4).stores({
      conversations: "_id, userId, parentMessageId, updatedAt, projectId",
      messages: "_id, conversationId, createdAt",
      notes: "_id, userId, projectId, updatedAt",
      tasks: "_id, userId, projectId, status, deadline, _creationTime",
      projects: "_id, userId",
      attachments: "_id, messageId",
      toolCalls: "_id, messageId",
      sources: "_id, messageId",
      pendingMutations: "_id, type, createdAt",
      userPreferences: "&_id",
    });

    // v5: P7 Tree Architecture - Add tree field indexes
    this.version(5).stores({
      conversations:
        "_id, userId, parentMessageId, updatedAt, projectId, activeLeafMessageId",
      messages:
        "_id, conversationId, createdAt, isActiveBranch, parentMessageId, rootMessageId",
      notes: "_id, userId, projectId, updatedAt",
      tasks: "_id, userId, projectId, status, deadline, _creationTime",
      projects: "_id, userId",
      attachments: "_id, messageId",
      toolCalls: "_id, messageId",
      sources: "_id, messageId",
      pendingMutations: "_id, type, createdAt",
      userPreferences: "&_id",
    });
  }
}

/**
 * Pending mutation for offline queue
 */
export interface PendingMutation {
  _id: string;
  type: "sendMessage" | "sendMessageV2" | "editMessage" | "deleteMessage";
  payload: unknown;
  createdAt: number;
  retries: number;
  state?: "pending" | "attention";
  error?: string;
}

// SSR guard: IndexedDB not available on server
let activeCache: BlahChatCache | null = null;

// Identity transitions are expected, not exceptional, for asynchronous work.
export function getActiveCache(): BlahChatCache | null {
  return typeof window === "undefined" ? null : activeCache;
}

export function getCache(): BlahChatCache {
  if (typeof window === "undefined") {
    // Return a mock for SSR - will never be called in practice
    // since all cache usage is in "use client" components
    throw new Error(
      "Attempted to access IndexedDB cache during SSR. Ensure cache is only used in client components.",
    );
  }
  if (!activeCache) {
    throw new Error("Cache unavailable until authentication is resolved");
  }
  return activeCache;
}

export function setActiveCache(database: BlahChatCache | null): void {
  activeCache = database;
}
