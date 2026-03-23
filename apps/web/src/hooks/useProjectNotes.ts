import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ProjectNote = {
  _id: string;
  title: string;
  content: string;
  projectId?: string;
  tags?: string[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
};

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

async function listProjectNotes(projectId: string) {
  const response = await fetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/notes`,
    {
      method: "GET",
    },
  );
  const items = await readEnvelope<Array<{ data: ProjectNote }>>(response);
  return items.map((item) => item.data);
}

export function useProjectNotes(projectId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["project-notes", projectId];

  const query = useQuery<ProjectNote[]>({
    queryKey,
    queryFn: async () => listProjectNotes(projectId ?? ""),
    enabled: Boolean(projectId),
    staleTime: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      title?: string;
      content?: string;
      tags?: string[];
      isPinned?: boolean;
    }) => {
      if (!projectId) {
        throw new Error("Project ID required");
      }

      const response = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/notes`,
        {
          method: "POST",
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
      if (!projectId) {
        throw new Error("Project ID required");
      }

      const response = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}`,
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
      if (!projectId) {
        throw new Error("Project ID required");
      }

      const response = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}`,
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
