"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { usePaginatedQuery, useQuery } from "convex/react";
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
  // Subscribe to Convex for real-time updates
  const convexMessages = usePaginatedQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.messages.listPaginated,
    conversationId ? { conversationId } : "skip",
    { initialNumItems },
  );

  // Sync to Dexie when Convex updates
  useEffect(() => {
    if (convexMessages.results?.length) {
      cache.messages.bulkPut(convexMessages.results).catch(console.error);
    }
  }, [convexMessages.results]);

  // Read from local cache (instant)
  // @ts-ignore - Dexie PromiseExtended type incompatible with useLiveQuery generics
  const cachedMessages: Doc<"messages">[] = useLiveQuery(
    () =>
      conversationId
        ? cache.messages
            .where("conversationId")
            .equals(conversationId)
            .sortBy("createdAt")
        : [],
    [conversationId],
    [],
  );

  // Determine loading states (compatible with useStableMessages)
  const isFirstLoad =
    convexMessages.results === undefined && cachedMessages.length === 0;

  return {
    results: cachedMessages,
    loadMore: convexMessages.loadMore,
    status: convexMessages.status,
    isLoading: convexMessages.isLoading,
    isFirstLoad,
  };
}

export function useMetadataCacheSync(messageIds: Id<"messages">[]) {
  // Stable reference using shallow comparison (avoids JSON.stringify every render)
  const prevIdsRef = useRef<Id<"messages">[]>([]);
  const stableIds = useMemo(() => {
    const changed =
      messageIds.length !== prevIdsRef.current.length ||
      messageIds.some((id, i) => id !== prevIdsRef.current[i]);
    if (changed) prevIdsRef.current = messageIds;
    return prevIdsRef.current;
  }, [messageIds]);

  // Batch fetch from Convex
  const metadata = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.messages.batchGetMetadata,
    stableIds.length > 0 ? { messageIds: stableIds } : "skip",
  );

  // Sync to Dexie (with null checks)
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

export function useConversationCacheSync(
  options: ConversationCacheSyncOptions = {},
) {
  const { projectId } = options;

  // Subscribe to Convex - pass projectId to server for filtering
  const conversations = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.conversations.list,
    { projectId: projectId || undefined },
  );

  // Sync to Dexie when Convex updates
  useEffect(() => {
    if (conversations?.length) {
      cache.conversations.bulkPut(conversations).catch(console.error);
    }
  }, [conversations]);

  // Read from local cache (instant) with project filtering
  const cachedConversations = useLiveQuery(
    async () => {
      const query = cache.conversations.toCollection();

      if (projectId === "none") {
        // Filter to conversations with no project
        return (await query.toArray()).filter((c) => !c.projectId);
      }
      if (projectId) {
        // Filter by specific project
        return cache.conversations
          .where("projectId")
          .equals(projectId)
          .toArray();
      }
      // No filter - return all
      return query.toArray();
    },
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
