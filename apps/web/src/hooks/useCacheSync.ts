"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { PREFERENCE_DEFAULTS } from "@blah-chat/backend/convex/users/constants";
import { useAction, usePaginatedQuery, useQuery } from "convex/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef } from "react";
import { cache } from "@/lib/cache";

interface MessageCacheSyncOptions {
  conversationId: Id<"conversations"> | undefined;
  initialNumItems?: number;
}

export function useMessageCacheSync({
  conversationId,
  initialNumItems = 50,
}: MessageCacheSyncOptions) {
  // Track conversation ID changes to detect switches
  const prevConversationIdRef = useRef<Id<"conversations"> | undefined>(
    conversationId,
  );
  const isConversationChanging =
    prevConversationIdRef.current !== conversationId;

  // Update ref IMMEDIATELY (not in useEffect) to prevent stale data on next render
  if (isConversationChanging) {
    prevConversationIdRef.current = conversationId;
  }

  // Subscribe to Convex for real-time updates
  const convexMessages = usePaginatedQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.messages.listPaginated,
    conversationId ? { conversationId } : "skip",
    { initialNumItems },
  );

  useEffect(() => {
    if (!conversationId || convexMessages.results === undefined) return;

    const syncCache = async () => {
      const convexIds = new Set(convexMessages.results.map((m) => m._id));
      const dexieRecords = await cache.messages
        .where("conversationId")
        .equals(conversationId)
        .toArray();

      const orphanIds = dexieRecords
        .filter((d) => !convexIds.has(d._id))
        .map((d) => d._id);

      if (orphanIds.length > 0) await cache.messages.bulkDelete(orphanIds);
      if (convexMessages.results.length > 0)
        await cache.messages.bulkPut(convexMessages.results);
    };

    syncCache().catch(console.error);
  }, [convexMessages.results, conversationId]);

  // @ts-ignore - Type depth exceeded
  const triggerAutoRename = useAction(
    api.conversations.actions.triggerAutoRename,
  );

  // Track whether auto-rename has been triggered for the current conversation
  const autoRenameTriggeredRef = useRef<Id<"conversations"> | null>(null);

  useEffect(() => {
    if (!conversationId || !convexMessages.results?.length) return;

    // Only trigger once per conversation
    if (autoRenameTriggeredRef.current === conversationId) return;
    autoRenameTriggeredRef.current = conversationId;

    triggerAutoRename({ conversationId }).catch(() => {});
  }, [conversationId, convexMessages.results?.length, triggerAutoRename]);

  // @ts-ignore - Dexie PromiseExtended type incompatible with useLiveQuery generics
  const cachedMessages: Doc<"messages">[] | undefined = useLiveQuery(
    () =>
      conversationId
        ? cache.messages
            .where("conversationId")
            .equals(conversationId)
            .sortBy("createdAt")
        : [],
    [conversationId],
    undefined, // Return undefined while loading, not []
  );

  // Validate that cached messages actually belong to current conversation
  // useLiveQuery can return stale data briefly when dependencies change
  const validatedMessages = cachedMessages?.every(
    (m) => m.conversationId === conversationId,
  )
    ? cachedMessages
    : undefined;

  // During conversation switch, force return undefined to prevent stale data flash
  const results = isConversationChanging ? undefined : validatedMessages;

  // Determine loading states (compatible with useStableMessages)
  // isFirstLoad should be true when:
  // 1. Convex is still loading (LoadingFirstPage) OR
  // 2. Cache is still empty/loading (results undefined) OR
  // 3. Convex has data but cache hasn't synced yet (mismatch in lengths)
  const hasConvexData =
    convexMessages.results && convexMessages.results.length > 0;
  const hasCacheData = results && results.length > 0;
  const isSyncInProgress = hasConvexData && !hasCacheData; // Convex loaded but cache not synced
  const isConvexStillLoading = convexMessages.status === "LoadingFirstPage";

  const isFirstLoad =
    isConvexStillLoading || results === undefined || isSyncInProgress;

  return {
    results,
    loadMore: convexMessages.loadMore,
    status: convexMessages.status,
    isLoading: convexMessages.isLoading,
    isFirstLoad,
  };
}

export function useMetadataCacheSync(messageIds: Id<"messages">[]) {
  const prevIdsRef = useRef<Id<"messages">[]>([]);
  const stableIds = useMemo(() => {
    const changed =
      messageIds.length !== prevIdsRef.current.length ||
      messageIds.some((id, i) => id !== prevIdsRef.current[i]);
    if (changed) prevIdsRef.current = messageIds;
    return prevIdsRef.current;
  }, [messageIds]);

  const metadata = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.messages.batchGetMetadata,
    stableIds.length > 0 ? { messageIds: stableIds } : "skip",
  );

  useEffect(() => {
    if (!metadata) return;

    const syncOps: Promise<unknown>[] = [];
    if (metadata.attachments?.length) {
      syncOps.push(cache.attachments.bulkPut(metadata.attachments));
    }
    if (metadata.toolCalls?.length) {
      syncOps.push(cache.toolCalls.bulkPut(metadata.toolCalls));
    }
    if (metadata.sources?.length) {
      syncOps.push(cache.sources.bulkPut(metadata.sources));
    }
    if (syncOps.length > 0) {
      Promise.all(syncOps).catch(console.error);
    }
  }, [metadata]);
}

interface ConversationCacheSyncOptions {
  projectId?: Id<"projects"> | "none" | null;
}

/**
 * Get conversations from Dexie filtered by projectId.
 * Note: "none" case uses toArray() + filter because Dexie can't index null/undefined values.
 */
async function getConversationsByProject(
  projectId: Id<"projects"> | "none" | null | undefined,
): Promise<Doc<"conversations">[]> {
  let conversations: Doc<"conversations">[];

  if (projectId && projectId !== "none") {
    conversations = await cache.conversations
      .where("projectId")
      .equals(projectId)
      .toArray();
  } else if (projectId === "none") {
    conversations = (await cache.conversations.toArray()).filter(
      (c) => !c.projectId,
    );
  } else {
    conversations = await cache.conversations.toArray();
  }

  // Sort: pinned first, then by lastMessageAt (newest first)
  return conversations.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.lastMessageAt - a.lastMessageAt;
  });
}

export function useConversationCacheSync(
  options: ConversationCacheSyncOptions = {},
) {
  const { projectId } = options;

  const conversations = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.conversations.list,
    { projectId: projectId || undefined },
  );

  useEffect(() => {
    if (conversations === undefined) return;

    const syncCache = async () => {
      const convexIds = new Set(conversations.map((c) => c._id));
      const dexieRecords = await getConversationsByProject(projectId);

      const orphanIds = dexieRecords
        .filter((d) => !convexIds.has(d._id))
        .map((d) => d._id);

      if (orphanIds.length > 0) await cache.conversations.bulkDelete(orphanIds);
      if (conversations.length > 0)
        await cache.conversations.bulkPut(conversations);
    };

    syncCache().catch(console.error);
  }, [conversations, projectId]);

  const cachedConversations = useLiveQuery(
    () => getConversationsByProject(projectId),
    [projectId],
    [] as Doc<"conversations">[],
  );

  return {
    conversations: cachedConversations,
    isLoading: conversations === undefined,
  };
}

export function useNoteCacheSync() {
  const notes = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.notes.list,
  );

  useEffect(() => {
    if (notes?.length) {
      cache.notes.bulkPut(notes).catch(console.error);
    }
  }, [notes]);

  const cachedNotes = useLiveQuery(
    () => cache.notes.toArray(),
    [],
    [] as Doc<"notes">[],
  );

  return {
    notes: cachedNotes,
    isLoading: notes === undefined && cachedNotes.length === 0,
  };
}

export function useTaskCacheSync() {
  const tasks = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.tasks.list,
    {},
  );

  useEffect(() => {
    if (tasks?.length) {
      cache.tasks.bulkPut(tasks).catch(console.error);
    }
  }, [tasks]);

  const cachedTasks = useLiveQuery(
    () => cache.tasks.toArray(),
    [],
    [] as Doc<"tasks">[],
  );

  return {
    tasks: cachedTasks,
    isLoading: tasks === undefined && cachedTasks.length === 0,
  };
}

export function useProjectCacheSync() {
  const projects = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.projects.list,
  );

  useEffect(() => {
    if (projects?.length) {
      cache.projects.bulkPut(projects).catch(console.error);
    }
  }, [projects]);

  const cachedProjects = useLiveQuery(
    () => cache.projects.toArray(),
    [],
    [] as Doc<"projects">[],
  );

  return {
    projects: cachedProjects,
    isLoading: projects === undefined && cachedProjects.length === 0,
  };
}

export function usePreferenceCacheSync() {
  const preferences = useQuery(
    // @ts-ignore - Type depth exceeded with Convex modules
    api.users.getAllUserPreferences,
  );

  useEffect(() => {
    if (preferences) {
      cache.userPreferences
        .put({ _id: "current", data: preferences })
        .catch(console.error);
    }
  }, [preferences]);

  const cachedPreferences = useLiveQuery(
    () => cache.userPreferences.get("current"),
    [],
    null,
  );

  return cachedPreferences?.data ?? preferences ?? PREFERENCE_DEFAULTS;
}

export function useCachedAttachments(messageId: Id<"messages"> | string) {
  return useLiveQuery(
    () => cache.attachments.where("messageId").equals(messageId).toArray(),
    [messageId],
    [] as Doc<"attachments">[],
  );
}

export function useCachedToolCalls(messageId: Id<"messages"> | string) {
  return useLiveQuery(
    () => cache.toolCalls.where("messageId").equals(messageId).toArray(),
    [messageId],
    [] as Doc<"toolCalls">[],
  );
}

export function useCachedSources(messageId: Id<"messages"> | string) {
  return useLiveQuery(
    () => cache.sources.where("messageId").equals(messageId).toArray(),
    [messageId],
    [] as Doc<"sources">[],
  );
}

export function useCachedChildBranches(
  parentMessageId: Id<"messages"> | string,
) {
  return useLiveQuery(
    () =>
      cache.conversations
        .where("parentMessageId")
        .equals(parentMessageId)
        .toArray(),
    [parentMessageId],
    [] as Doc<"conversations">[],
  );
}
