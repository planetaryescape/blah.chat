import type { Note } from "@blah-chat/api-client";
import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

export function useNotes(params: { projectId?: string | null } = {}) {
  const sdk = useSDKClient();

  return useQuery<Note[]>({
    queryKey: ["notes", params],
    queryFn: () => sdk.listNotes(params),
    staleTime: 10_000,
  });
}

export function useNote(noteId: string | null) {
  const sdk = useSDKClient();

  return useQuery<Note>({
    queryKey: ["note", noteId],
    enabled: !!noteId,
    queryFn: () => sdk.getNote(noteId!),
  });
}

export function useNotesByMessage(messageId: string | null) {
  const sdk = useSDKClient();

  return useQuery<Note[]>({
    queryKey: ["notes-by-message", messageId],
    enabled: !!messageId && !messageId.startsWith("temp-"),
    queryFn: async () => {
      const notes = await sdk.listNotes();
      return notes.filter((n) => n.sourceMessageId === messageId);
    },
    staleTime: 15_000,
  });
}
