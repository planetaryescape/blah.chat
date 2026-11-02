export type NoteSavePatch = {
  noteId: string;
  content?: string;
  title?: string;
};

export function getNoteExitPatch(
  current: { noteId: string; content: string; title: string },
  draft: { content: string; title: string; titleEdited: boolean },
): NoteSavePatch | null {
  const contentChanged = draft.content !== current.content;
  const titleChanged = draft.titleEdited && draft.title !== current.title;
  if (!contentChanged && !titleChanged) return null;
  return {
    noteId: current.noteId,
    ...(contentChanged ? { content: draft.content } : {}),
    ...(titleChanged ? { title: draft.title || "Untitled Note" } : {}),
  };
}

/** Keep the guard after navigation; release it only when saving fails. */
export async function leaveNote(
  inFlight: { current: boolean },
  patch: NoteSavePatch | null,
  save: (patch: NoteSavePatch) => Promise<boolean | undefined>,
  navigate: () => void,
): Promise<void> {
  if (inFlight.current) return;
  inFlight.current = true;
  try {
    if (patch && !(await save(patch))) {
      inFlight.current = false;
      return;
    }
    navigate();
  } catch (error) {
    inFlight.current = false;
    throw error;
  }
}
