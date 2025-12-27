import "server-only";
import { api } from "@blah-chat/backend/convex/_generated/api";
import { z } from "zod";
import { getConvexClient } from "@/lib/api/convex";
import { formatEntity } from "@/lib/utils/formatEntity";

const updatePreferenceSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

export const preferencesDAL = {
  /**
   * Get single preference by key
   */
  get: async (_userId: string, key: string) => {
    const convex = getConvexClient();

    const preference = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserPreference,
      {
        key,
      },
    )) as any;

    return formatEntity({ key, value: preference }, "preference");
  },

  /**
   * Get all user preferences
   */
  getAll: async (_userId: string) => {
    const convex = getConvexClient();

    const preferences = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getAllUserPreferences,
      {},
    )) as any;

    return formatEntity(preferences, "preferences");
  },

  /**
   * Update single preference
   */
  update: async (
    _userId: string,
    data: z.infer<typeof updatePreferenceSchema>,
  ) => {
    const validated = updatePreferenceSchema.parse(data);
    const convex = getConvexClient();

    await convex.mutation(api.users.updatePreferences, {
      preferences: {
        [validated.key]: validated.value,
      },
    });

    // Return updated preference
    const preference = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserPreference,
      {
        key: validated.key,
      },
    )) as any;

    return formatEntity(
      { key: validated.key, value: preference },
      "preference",
    );
  },
};
