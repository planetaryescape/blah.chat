import { z } from "zod";
import {
  countKnowledgeSources,
  createKnowledgeSource,
  deleteKnowledgeSource,
  getKnowledgeSourceWithChunks,
  listKnowledgeSources,
  reprocessKnowledgeSource,
} from "@/lib/persistence/knowledge";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

const listKnowledgeSchema = z.object({
  projectId: z.string().optional().nullable(),
});

const createKnowledgeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("file"),
    title: z.string().min(1),
    projectId: z.string().optional().nullable(),
    storageId: z.string().min(1),
    mimeType: z.string().min(1),
    size: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("text"),
    title: z.string().min(1),
    projectId: z.string().optional().nullable(),
    content: z.string().min(1).max(1_000_000),
  }),
  z.object({
    type: z.literal("web"),
    title: z.string().min(1),
    projectId: z.string().optional().nullable(),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal("youtube"),
    title: z.string().min(1),
    projectId: z.string().optional().nullable(),
    url: z.string().min(1),
  }),
]);

export const knowledgeDAL = {
  list: async (clerkUserId: string, query: unknown) => {
    const validated = listKnowledgeSchema.parse(query);
    const items = await listKnowledgeSources(clerkUserId, validated);
    return formatEntityList(items, "knowledgeSource");
  },

  count: async (clerkUserId: string, query: unknown) => {
    const validated = listKnowledgeSchema.parse(query);
    const count = await countKnowledgeSources(clerkUserId, validated);
    return formatEntity(count, "knowledgeSource");
  },

  create: async (
    clerkUserId: string,
    payload: z.input<typeof createKnowledgeSchema>,
  ) => {
    const validated = createKnowledgeSchema.parse(payload);
    const source = await createKnowledgeSource(clerkUserId, validated);
    return formatEntity(source, "knowledgeSource", source._id);
  },

  getById: async (clerkUserId: string, sourceId: string) => {
    const source = await getKnowledgeSourceWithChunks(clerkUserId, sourceId);
    return formatEntity(source, "knowledgeSource", source._id);
  },

  reprocess: async (clerkUserId: string, sourceId: string) => {
    const result = await reprocessKnowledgeSource(clerkUserId, sourceId);
    return formatEntity(result, "knowledgeSource", sourceId);
  },

  delete: async (clerkUserId: string, sourceId: string) => {
    const result = await deleteKnowledgeSource(clerkUserId, sourceId);
    return formatEntity(result, "knowledgeSource", sourceId);
  },
};
