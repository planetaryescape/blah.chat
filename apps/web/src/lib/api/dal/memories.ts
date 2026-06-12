import { z } from "zod";
import {
  consolidateMemories,
  createMemory,
  deleteAllMemories,
  deleteMemory,
  deleteSelectedMemories,
  listMemories,
  scanRecentConversationsForMemories,
} from "@/lib/persistence/memories";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

const listMemoriesSchema = z.object({
  category: z.string().optional(),
  sortBy: z.enum(["date", "importance", "confidence"]).optional(),
  searchQuery: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

const createMemorySchema = z.object({
  content: z.string().min(1).max(16_000),
  category: z.string().optional(),
});

const deleteSelectedSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

const consolidateSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
});

export const memoriesDAL = {
  list: async (clerkUserId: string, query: unknown) => {
    const validated = listMemoriesSchema.parse(query);
    const items = await listMemories(clerkUserId, validated);
    return formatEntityList(items, "memory");
  },

  create: async (
    clerkUserId: string,
    payload: z.input<typeof createMemorySchema>,
  ) => {
    const validated = createMemorySchema.parse(payload);
    const memory = await createMemory(clerkUserId, validated);
    return formatEntity(memory, "memory", memory._id);
  },

  delete: async (clerkUserId: string, memoryId: string) => {
    const result = await deleteMemory(clerkUserId, memoryId);
    return formatEntity(result, "memory", memoryId);
  },

  deleteSelected: async (
    clerkUserId: string,
    payload: z.input<typeof deleteSelectedSchema>,
  ) => {
    const validated = deleteSelectedSchema.parse(payload);
    const result = await deleteSelectedMemories(clerkUserId, validated.ids);
    return formatEntity(result, "memory");
  },

  deleteAll: async (clerkUserId: string) => {
    const result = await deleteAllMemories(clerkUserId);
    return formatEntity(result, "memory");
  },

  consolidate: async (
    clerkUserId: string,
    payload: z.input<typeof consolidateSchema>,
  ) => {
    const validated = consolidateSchema.parse(payload);
    const result = await consolidateMemories(clerkUserId, validated);
    return formatEntity(result, "memory");
  },

  scanRecent: async (clerkUserId: string) => {
    const result = await scanRecentConversationsForMemories(clerkUserId);
    return formatEntity(result, "memory");
  },
};
