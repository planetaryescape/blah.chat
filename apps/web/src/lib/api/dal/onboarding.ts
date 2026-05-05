import "server-only";
import { z } from "zod";
import {
  getOnboarding,
  resetOnboarding,
  updateOnboarding,
} from "@/lib/persistence/onboarding";
import { formatEntity } from "@/lib/utils/formatEntity";

const onboardingPatchSchema = z
  .object({
    tourCompleted: z.boolean().optional(),
    tourSkipped: z.boolean().optional(),
    autoRouterPreferenceSet: z.boolean().optional(),
    flags: z
      .record(
        z.string(),
        z.union([z.boolean(), z.string(), z.number(), z.null()]),
      )
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const onboardingDAL = {
  async get(clerkUserId: string) {
    const row = await getOnboarding(clerkUserId);
    return formatEntity(row, "onboarding", row.userId);
  },

  async update(clerkUserId: string, payload: unknown) {
    const validated = onboardingPatchSchema.parse(payload);
    const row = await updateOnboarding(clerkUserId, validated);
    return formatEntity(row, "onboarding", row.userId);
  },

  async reset(clerkUserId: string) {
    const row = await resetOnboarding(clerkUserId);
    return formatEntity(row, "onboarding", row.userId);
  },
};
