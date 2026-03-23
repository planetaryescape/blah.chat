import "server-only";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { formatEntity } from "@/lib/utils/formatEntity";

export const usersDAL = {
  /**
   * Get current user by Clerk ID (auto-creates if needed)
   */
  getCurrentOrCreate: async (clerkId: string) => {
    const user = await ensureCurrentPersistenceUser(clerkId);

    return formatEntity(
      {
        _id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl ?? undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      "user",
      user.id,
    );
  },
};
