import type { Note } from "@blah-chat/api-client";
import {
  useCreateNote,
  useDeleteNote,
  useUpdateNote,
} from "@/lib/hooks/mutations/useNoteMutations";
import { useNotes } from "@/lib/hooks/queries/useNotes";

export type ProjectNote = Note;

export function useProjectNotes(projectId: string | null) {
  const query = useNotes({ projectId });
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createNote: (payload: {
      title?: string;
      content?: string;
      tags?: string[];
      isPinned?: boolean;
    }) => {
      if (!projectId) {
        return Promise.reject(new Error("Project ID required"));
      }
      return createMutation.mutateAsync({ ...payload, projectId });
    },
    updateNote: updateMutation.mutateAsync,
    deleteNote: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
