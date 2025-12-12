import "server-only";
import { getConvexClient } from "@/lib/api/convex";
import { api } from "@/convex/_generated/api";
import { formatEntity } from "@/lib/utils/formatEntity";

export const usersDAL = {
  /**
   * Get current user by Clerk ID (auto-creates if needed)
   */
  getCurrentOrCreate: async (clerkId: string) => {
    const convex = getConvexClient();

    const user = await convex.query(api.users.getUserByClerkId, { clerkId });

    if (!user) {
      throw new Error("User not found");
    }

    return formatEntity(user, "user", user._id);
  },
};
