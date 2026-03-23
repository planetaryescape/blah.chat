import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectNote } from "./useProjectNotes";

export type { ProjectNote };

async function readEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as {
    data?: T;
    error?: string;
  };

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data;
}

async function listNotes() {
  const response = await fetch("/api/v1/notes", { method: "GET" });
  const items = await readEnvelope<Array<{ data: ProjectNote }>>(response);
  return items.map((item) => item.data);
}

export function useNotes() {
  const queryClient = useQueryClient();
  const queryKey = ["notes"];
  const query = useQuery<ProjectNote[]>({
    queryKey,
    queryFn: listNotes,
    staleTime: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      title?: string;
      content?: string;
      tags?: string[];
      isPinned?: boolean;
      projectId?: string | null;
    }) => {
      const response = await fetch("/api/v1/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return readEnvelope<ProjectNote>(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      noteId,
      ...payload
    }: {
      noteId: string;
      title?: string;
      content?: string;
      tags?: string[];
      isPinned?: boolean;
    }) => {
      const response = await fetch(
        `/api/v1/notes/${encodeURIComponent(noteId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      return readEnvelope<ProjectNote>(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(
        `/api/v1/notes/${encodeURIComponent(noteId)}`,
        {
          method: "DELETE",
        },
      );
      return readEnvelope<{ deleted: boolean; noteId: string }>(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createNote: createMutation.mutateAsync,
    updateNote: updateMutation.mutateAsync,
    deleteNote: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
