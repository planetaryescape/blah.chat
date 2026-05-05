import "server-only";
import type { AutoRouterConfigValue } from "@blah-chat/persistence-postgres";
import { z } from "zod";
import {
  getAutoRouterConfig,
  updateAutoRouterConfig,
} from "@/lib/persistence/autoRouter";
import { formatEntity } from "@/lib/utils/formatEntity";

export const updateAutoRouterConfigSchema = z
  .object({
    contextBuffer: z.number().min(1).max(2).optional(),
    longContextThreshold: z.number().int().min(1024).optional(),
    classifierConfidenceThreshold: z.number().min(0).max(1).optional(),
    classifierTopK: z.number().int().min(1).max(20).optional(),
    classifierFallbackEnabled: z.boolean().optional(),
  })
  .partial()
  .strict();

export type AutoRouterConfigPatch = z.infer<
  typeof updateAutoRouterConfigSchema
>;

export const autoRouterDAL = {
  get: async () => {
    const value = await getAutoRouterConfig();
    return formatEntity(value, "auto_router_config", "global");
  },

  update: async (clerkUserId: string, payload: unknown) => {
    const validated = updateAutoRouterConfigSchema.parse(
      payload,
    ) as Partial<AutoRouterConfigValue>;
    const value = await updateAutoRouterConfig(clerkUserId, validated);
    return formatEntity(value, "auto_router_config", "global");
  },
};
