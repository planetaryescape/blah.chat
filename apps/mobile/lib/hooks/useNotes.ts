import type { Note } from "@blah-chat/api-client";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { queryClient } from "@/lib/cache/queryClient";
import type { Id } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

function invalidateNoteQueries(noteId?: string) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === "mobile" &&
      query.queryKey[1] === "notes",
  });

  if (!noteId) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey: ["mobile", "note", noteId],
  });
}

async function getNoteForMutation(
  getToken: () => Promise<string | null>,
  noteId: string,
) {
  const client = createMobileSdkClient(() => getToken());
  return client.getNote(noteId);
}

export function useNotes() {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["mobile", "notes", { projectId: undefined }],
    staleTime: 10_000,
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.listNotes();
    },
  });

  return query.data as Note[] | undefined;
}

export function useNote(noteId: Id<"notes"> | null) {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["mobile", "note", noteId],
    enabled: !!noteId,
    queryFn: async () => {
      if (!noteId) {
        return null;
      }

      const client = createMobileSdkClient(() => getToken());
      return client.getNote(noteId);
    },
  });

  return query.data as Note | null | undefined;
}

export function useSearchNotes(
  searchQuery: string,
  options?: {
    projectId?: Id<"projects">;
    filterPinned?: boolean;
    filterTags?: string[];
  },
) {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: [
      "mobile",
      "notes",
      {
        projectId: options?.projectId ?? undefined,
      },
    ],
    staleTime: 10_000,
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.listNotes({
        projectId: options?.projectId ?? undefined,
      });
    },
  });

  return useMemo(() => {
    const notes = query.data;
    if (!notes) {
      return notes;
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const requiredTags = options?.filterTags?.filter(Boolean) ?? [];

    return notes.filter((note) => {
      if (options?.filterPinned && !note.isPinned) {
        return false;
      }

      if (
        requiredTags.length > 0 &&
        !requiredTags.every((tag) => note.tags?.includes(tag))
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        note.title,
        note.content,
        ...(note.tags ?? []),
        ...(note.suggestedTags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [options?.filterPinned, options?.filterTags, query.data, searchQuery]);
}

export function useCreateNote() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: {
      title?: string;
      content?: string;
      tags?: string[];
      isPinned?: boolean;
      projectId?: Id<"projects">;
      sourceMessageId?: Id<"messages">;
      sourceConversationId?: Id<"conversations">;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.createNote(args);
    },
    onSuccess: (note) => {
      queryClient.setQueryData(["mobile", "note", note._id], note);
      invalidateNoteQueries(note._id);
    },
  });

  return async (args: {
    title?: string;
    content?: string;
    tags?: string[];
    isPinned?: boolean;
    projectId?: Id<"projects">;
    sourceMessageId?: Id<"messages">;
    sourceConversationId?: Id<"conversations">;
  }) => {
    const note = await mutation.mutateAsync(args);
    return note._id as Id<"notes">;
  };
}

export function useUpdateNote() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: {
      noteId: Id<"notes">;
      title?: string;
      content?: string;
      tags?: string[];
      isPinned?: boolean;
      projectId?: Id<"projects">;
      suggestedTags?: string[];
      shareId?: string | null;
      isPublic?: boolean;
      shareExpiresAt?: number | null;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      const { noteId, ...payload } = args;
      return client.updateNote(noteId, payload);
    },
    onSuccess: (note) => {
      queryClient.setQueryData(["mobile", "note", note._id], note);
      invalidateNoteQueries(note._id);
    },
  });

  return async (args: {
    noteId: Id<"notes">;
    title?: string;
    content?: string;
    tags?: string[];
    isPinned?: boolean;
    projectId?: Id<"projects">;
    suggestedTags?: string[];
    shareId?: string | null;
    isPublic?: boolean;
    shareExpiresAt?: number | null;
  }) => mutation.mutateAsync(args);
}

export function useDeleteNote() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { noteId: Id<"notes"> }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.deleteNote(args.noteId);
    },
    onSuccess: (_result, variables) => {
      queryClient.removeQueries({
        queryKey: ["mobile", "note", variables.noteId],
      });
      invalidateNoteQueries(variables.noteId);
    },
  });

  return async (args: { noteId: Id<"notes"> }) => mutation.mutateAsync(args);
}

export function useToggleNotePin() {
  const { getToken } = useAuth();
  const updateNote = useUpdateNote();

  return async (args: { noteId: Id<"notes"> }) => {
    const note = await getNoteForMutation(getToken, args.noteId);
    return updateNote({
      noteId: args.noteId,
      isPinned: !note.isPinned,
    });
  };
}

export function useAddNoteTag() {
  const { getToken } = useAuth();
  const updateNote = useUpdateNote();

  return async (args: { noteId: Id<"notes">; tag: string }) => {
    const note = await getNoteForMutation(getToken, args.noteId);
    const tags = Array.from(new Set([...(note.tags ?? []), args.tag]));
    return updateNote({
      noteId: args.noteId,
      tags,
    });
  };
}

export function useRemoveNoteTag() {
  const { getToken } = useAuth();
  const updateNote = useUpdateNote();

  return async (args: { noteId: Id<"notes">; tag: string }) => {
    const note = await getNoteForMutation(getToken, args.noteId);
    return updateNote({
      noteId: args.noteId,
      tags: (note.tags ?? []).filter((tag) => tag !== args.tag),
    });
  };
}

export function useAcceptNoteTag() {
  const { getToken } = useAuth();
  const updateNote = useUpdateNote();

  return async (args: { noteId: Id<"notes">; tag: string }) => {
    const note = await getNoteForMutation(getToken, args.noteId);
    const tags = Array.from(new Set([...(note.tags ?? []), args.tag]));
    const suggestedTags = (note.suggestedTags ?? []).filter(
      (tag) => tag !== args.tag,
    );

    return updateNote({
      noteId: args.noteId,
      tags,
      suggestedTags,
    });
  };
}

export function useTriggerAutoTag() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { noteId: Id<"notes"> }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.autoTagNote(args.noteId);
    },
    onSuccess: (_result, variables) => {
      invalidateNoteQueries(variables.noteId);
    },
  });

  return async (args: { noteId: Id<"notes"> }) => mutation.mutateAsync(args);
}

export function useCreateNoteShare() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: {
      noteId: Id<"notes">;
      password?: string;
      expiresIn?: number;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      const { noteId, ...payload } = args;
      return client.createNoteShare(noteId, payload);
    },
    onSuccess: (note) => {
      queryClient.setQueryData(["mobile", "note", note._id], note);
      invalidateNoteQueries(note._id);
    },
  });

  return async (args: {
    noteId: Id<"notes">;
    password?: string;
    expiresIn?: number;
  }) => mutation.mutateAsync(args);
}

export function useToggleNoteShare() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { noteId: Id<"notes">; isActive: boolean }) => {
      const client = createMobileSdkClient(() => getToken());
      return client.toggleNoteShare(args.noteId, {
        isActive: args.isActive,
      });
    },
    onSuccess: (note) => {
      queryClient.setQueryData(["mobile", "note", note._id], note);
      invalidateNoteQueries(note._id);
    },
  });

  return async (args: { noteId: Id<"notes">; isActive: boolean }) =>
    mutation.mutateAsync(args);
}
