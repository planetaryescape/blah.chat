import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["notes"] });
    queryClient.invalidateQueries({ queryKey: ["note"] });
    queryClient.invalidateQueries({ queryKey: ["notes-by-message"] });
    queryClient.invalidateQueries({ queryKey: ["project-notes"] });
  };
}

export function useCreateNote() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateNotes();

  return useMutation({
    mutationFn: (payload: {
      title?: string;
      content?: string;
      tags?: string[];
      isPinned?: boolean;
      projectId?: string | null;
      sourceMessageId?: string;
      sourceConversationId?: string;
    }) => sdk.createNote(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateNote() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateNotes();

  return useMutation({
    mutationFn: ({
      noteId,
      ...payload
    }: {
      noteId: string;
      title?: string;
      content?: string;
      tags?: string[];
      isPinned?: boolean;
      projectId?: string | null;
      suggestedTags?: string[];
    }) => sdk.updateNote(noteId, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteNote() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateNotes();

  return useMutation({
    mutationFn: (noteId: string) => sdk.deleteNote(noteId),
    onSuccess: () => invalidate(),
  });
}
