import { z } from "zod";
import {
  createNote,
  createNoteShare,
  createProjectNote,
  deleteNote,
  deleteProjectNote,
  getNote,
  getNoteShareMetadata,
  listNotes,
  listProjectNotes,
  toggleNoteShare,
  triggerNoteAutoTag,
  updateNote,
  updateProjectNote,
  verifyNoteShare,
} from "@/lib/persistence/notes";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

const createProjectNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  sourceMessageId: z.string().optional(),
  sourceConversationId: z.string().optional(),
});

const updateProjectNoteSchema = createProjectNoteSchema.partial().extend({
  projectId: z.string().optional().nullable(),
  suggestedTags: z.array(z.string()).optional(),
  shareId: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  shareExpiresAt: z.number().int().optional().nullable(),
});

const noteShareSchema = z.object({
  password: z.string().trim().min(1).max(200).optional(),
  expiresIn: z.number().int().positive().max(3650).optional(),
});

const toggleNoteShareSchema = z.object({
  isActive: z.boolean(),
});

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

  get: async (clerkUserId: string, noteId: string) => {
    const note = await getNote(clerkUserId, noteId);
    return formatEntity(note, "note", note._id);
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

  triggerAutoTag: async (clerkUserId: string, noteId: string) => {
    const result = await triggerNoteAutoTag(clerkUserId, noteId);
    return formatEntity(result, "note", noteId);
  },

  createShare: async (
    clerkUserId: string,
    noteId: string,
    payload: z.input<typeof noteShareSchema>,
  ) => {
    const validated = noteShareSchema.parse(payload);
    const note = await createNoteShare(clerkUserId, noteId, validated);
    return formatEntity(note, "note", note._id);
  },

  toggleShare: async (
    clerkUserId: string,
    noteId: string,
    payload: z.input<typeof toggleNoteShareSchema>,
  ) => {
    const validated = toggleNoteShareSchema.parse(payload);
    const note = await toggleNoteShare(clerkUserId, noteId, validated);
    return formatEntity(note, "note", note._id);
  },

  getPublicShareMetadata: async (
    shareId: string,
    viewerClerkUserId?: string,
  ) => {
    const share = await getNoteShareMetadata(shareId, viewerClerkUserId);
    return share ? formatEntity(share, "note_share", share._id) : null;
  },

  verifyPublicShare: async (
    shareId: string,
    payload: { password?: string; viewerClerkUserId?: string },
  ) => {
    const share = await verifyNoteShare(shareId, payload);
    return formatEntity(share, "note", share._id);
  },
};
