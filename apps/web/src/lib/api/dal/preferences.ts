import "server-only";
import { api } from "@blah-chat/backend/convex/_generated/api";
import { z } from "zod";
import { getAuthenticatedConvexClient } from "@/lib/api/convex";
import { formatEntity } from "@/lib/utils/formatEntity";

const updatePreferenceSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

export const preferencesDAL = {
  /**
   * Get single preference by key
   */
  get: async (userId: string, sessionToken: string, key: string) => {
    const convex = getAuthenticatedConvexClient(sessionToken);

    const user = await convex.query(api.users.getUserByClerkId, {
      clerkId: userId,
    });
    if (!user) {
      throw new Error("Access denied");
    }

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
  getAll: async (userId: string, sessionToken: string) => {
    const convex = getAuthenticatedConvexClient(sessionToken);

    const user = await convex.query(api.users.getUserByClerkId, {
      clerkId: userId,
    });
    if (!user) {
      throw new Error("Access denied");
    }

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
    userId: string,
    sessionToken: string,
    data: z.infer<typeof updatePreferenceSchema>,
  ) => {
    const validated = updatePreferenceSchema.parse(data);
    const convex = getAuthenticatedConvexClient(sessionToken);

    const user = await convex.query(api.users.getUserByClerkId, {
      clerkId: userId,
    });
    if (!user) {
      throw new Error("Access denied");
    }

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
