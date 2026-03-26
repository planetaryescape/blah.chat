import {
  assignConversationsToProject,
  createProject,
  deleteProject,
  getProject,
  getProjectStats,
  listProjectAttachments,
  listProjects,
  listProjectTemplates,
  updateProject,
} from "@/lib/persistence/projects";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(3000).optional(),
  isTemplate: z.boolean().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(3000).optional(),
});

const assignConversationsSchema = z.object({
  projectId: z.string().nullable(),
  conversationIds: z.array(z.string().min(1)).min(1),
});

export const projectsDAL = {
  list: async (clerkUserId: string) => {
    const items = await listProjects(clerkUserId);
    return formatEntityList(items, "project");
  },

  listTemplates: async (clerkUserId: string) => {
    const items = await listProjectTemplates(clerkUserId);
    return formatEntityList(items, "project");
  },

  get: async (clerkUserId: string, projectId: string) => {
    const project = await getProject(clerkUserId, projectId);
    return formatEntity(project, "project", project._id);
  },

  stats: async (clerkUserId: string, projectId: string) => {
    const stats = await getProjectStats(clerkUserId, projectId);
    return formatEntity(stats, "project", projectId);
  },

  listAttachments: async (clerkUserId: string, projectId: string) => {
    const items = await listProjectAttachments(clerkUserId, projectId);
    return formatEntityList(items, "attachment");
  },

  create: async (
    clerkUserId: string,
    payload: z.input<typeof createProjectSchema>,
  ) => {
    const validated = createProjectSchema.parse(payload);
    const project = await createProject(clerkUserId, validated);
    return formatEntity(project, "project", project._id);
  },

  update: async (
    clerkUserId: string,
    projectId: string,
    payload: z.input<typeof updateProjectSchema>,
  ) => {
    const validated = updateProjectSchema.parse(payload);
    const project = await updateProject(clerkUserId, projectId, validated);
    return formatEntity(project, "project", project._id);
  },

  remove: async (clerkUserId: string, projectId: string) => {
    const result = await deleteProject(clerkUserId, projectId);
    return formatEntity(result, "project", projectId);
  },

  assignConversations: async (
    clerkUserId: string,
    payload: z.input<typeof assignConversationsSchema>,
  ) => {
    const validated = assignConversationsSchema.parse(payload);
    const result = await assignConversationsToProject(clerkUserId, validated);
    return formatEntity(result, "project");
  },
};
