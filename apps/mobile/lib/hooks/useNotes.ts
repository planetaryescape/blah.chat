import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";

export function useNotes() {
  return useQuery(api.notes.list);
}

export function useNote(noteId: Id<"notes"> | null) {
  return useQuery(api.notes.getNote, noteId ? { noteId } : "skip");
}

export function useSearchNotes(
  searchQuery: string,
  options?: {
    projectId?: Id<"projects">;
    filterPinned?: boolean;
    filterTags?: string[];
  },
) {
  return useQuery(api.notes.searchNotes, {
    searchQuery,
    projectId: options?.projectId,
    filterPinned: options?.filterPinned,
    filterTags: options?.filterTags,
  });
}

export function useCreateNote() {
  return useMutation(api.notes.createNote);
}

export function useUpdateNote() {
  return useMutation(api.notes.updateNote);
}

export function useDeleteNote() {
  return useMutation(api.notes.deleteNote);
}

export function useToggleNotePin() {
  return useMutation(api.notes.togglePin);
}

export function useAddNoteTag() {
  return useMutation(api.notes.addTag);
}

export function useRemoveNoteTag() {
  return useMutation(api.notes.removeTag);
}

export function useAcceptNoteTag() {
  return useMutation(api.notes.acceptTag);
}

export function useTriggerAutoTag() {
  return useAction(api.notes.triggerAutoTag);
}

export function useCreateNoteShare() {
  return useAction(api.notes.createShare);
}

export function useToggleNoteShare() {
  return useMutation(api.notes.toggleShare);
}
