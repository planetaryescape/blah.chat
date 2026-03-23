import { z } from "zod";
import {
  createNote,
  createProjectNote,
  deleteNote,
  deleteProjectNote,
  listNotes,
  listProjectNotes,
  updateNote,
  updateProjectNote,
} from "@/lib/persistence/notes";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

const createProjectNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
});

const updateProjectNoteSchema = createProjectNoteSchema.partial();

export const notesDAL = {
  list: async (
    clerkUserId: string,
    query: { projectId?: string | null } = {},
  ) => {
    const items = await listNotes(clerkUserId, query);
    return formatEntityList(items, "note");
  },

  listProject: async (clerkUserId: string, projectId: string) => {
    const items = await listProjectNotes(clerkUserId, projectId);
    return formatEntityList(items, "note");
  },

  create: async (
    clerkUserId: string,
    payload: z.input<typeof createProjectNoteSchema> & {
      projectId?: string | null;
    },
  ) => {
    const validated = createProjectNoteSchema
      .extend({
        projectId: z.string().optional().nullable(),
      })
      .parse(payload);
    const note = await createNote(clerkUserId, validated);
    return formatEntity(note, "note", note._id);
  },

  createProject: async (
    clerkUserId: string,
    projectId: string,
    payload: z.input<typeof createProjectNoteSchema>,
  ) => {
    const validated = createProjectNoteSchema.parse(payload);
    const note = await createProjectNote(clerkUserId, projectId, validated);
    return formatEntity(note, "note", note._id);
  },

  update: async (
    clerkUserId: string,
    noteId: string,
    payload: z.input<typeof updateProjectNoteSchema>,
  ) => {
    const validated = updateProjectNoteSchema.parse(payload);
    const note = await updateNote(clerkUserId, noteId, validated);
    return formatEntity(note, "note", note._id);
  },

  updateProject: async (
    clerkUserId: string,
    projectId: string,
    noteId: string,
    payload: z.input<typeof updateProjectNoteSchema>,
  ) => {
    const validated = updateProjectNoteSchema.parse(payload);
    const note = await updateProjectNote(
      clerkUserId,
      projectId,
      noteId,
      validated,
    );
    return formatEntity(note, "note", note._id);
  },

  delete: async (clerkUserId: string, noteId: string) => {
    const result = await deleteNote(clerkUserId, noteId);
    return formatEntity(result, "note", noteId);
  },

  deleteProject: async (
    clerkUserId: string,
    projectId: string,
    noteId: string,
  ) => {
    const result = await deleteProjectNote(clerkUserId, projectId, noteId);
    return formatEntity(result, "note", noteId);
  },
};
