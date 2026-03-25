import type { Note } from "@blah-chat/api-client";
import {
  useCreateNote,
  useDeleteNote,
  useUpdateNote,
} from "@/lib/hooks/mutations/useNoteMutations";
import { useNotes as useNotesQuery } from "@/lib/hooks/queries/useNotes";

export type ProjectNote = Note;

export function useNotes() {
  const query = useNotesQuery();
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

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
