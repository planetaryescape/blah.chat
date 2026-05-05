import "server-only";
import type { AdminSettingsValue } from "@blah-chat/persistence-postgres";
import { z } from "zod";
import {
  getAdminSettings,
  updateAdminSettings,
} from "@/lib/persistence/adminSettings";
import { formatEntity } from "@/lib/utils/formatEntity";

const transcriptProviderSchema = z.enum([
  "groq",
  "openai",
  "deepgram",
  "assemblyai",
]);

export const updateAdminSettingsSchema = z
  .object({
    limits: z
      .object({
        defaultMonthlyBudget: z.number().min(0).optional(),
        defaultBudgetAlertThreshold: z.number().min(0).max(1).optional(),
        budgetHardLimitEnabled: z.boolean().optional(),
        defaultDailyMessageLimit: z.number().int().min(0).optional(),
        defaultMaxIntegrations: z.number().int().min(0).optional(),
      })
      .partial()
      .optional(),
    features: z
      .object({
        canvasMode: z.boolean().optional(),
        comparisonMode: z.boolean().optional(),
        voiceInput: z.boolean().optional(),
        imageGeneration: z.boolean().optional(),
        codeExecution: z.boolean().optional(),
        autoRouter: z.boolean().optional(),
      })
      .partial()
      .optional(),
    proTier: z
      .object({
        proModelsEnabled: z.boolean().optional(),
        tier1DailyProModelLimit: z.number().int().min(0).optional(),
        tier2MonthlyProModelLimit: z.number().int().min(0).optional(),
      })
      .partial()
      .optional(),
    search: z
      .object({
        hybridEnabled: z.boolean().optional(),
        rrfK: z.number().int().min(1).optional(),
        maxResults: z.number().int().min(1).optional(),
        embeddingsEnabled: z.boolean().optional(),
      })
      .partial()
      .optional(),
    memory: z
      .object({
        maxMemoriesPerUser: z.number().int().min(0).optional(),
        autoExtractionEnabled: z.boolean().optional(),
        consolidationIntervalDays: z.number().int().min(1).optional(),
        extractEveryNMessages: z.number().int().min(3).max(20).optional(),
      })
      .partial()
      .optional(),
    transcriptProvider: z
      .object({
        provider: transcriptProviderSchema.optional(),
        costPerMinute: z.number().min(0).optional(),
      })
      .partial()
      .optional(),
  })
  .partial()
  .strict();

export type AdminSettingsPatch = z.infer<typeof updateAdminSettingsSchema>;

export const adminSettingsDAL = {
  get: async () => {
    const value = await getAdminSettings();
    return formatEntity(value, "admin_settings", "global");
  },

  update: async (clerkUserId: string, payload: unknown) => {
    const validated = updateAdminSettingsSchema.parse(
      payload,
    ) as Partial<AdminSettingsValue>;
    const value = await updateAdminSettings(clerkUserId, validated);
    return formatEntity(value, "admin_settings", "global");
  },
};
