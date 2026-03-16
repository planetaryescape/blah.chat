import "server-only";
import { createUserRepository } from "@blah-chat/persistence-postgres";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";

export const usersDAL = {
  /**
   * Get current user by Clerk ID (auto-creates if needed)
   */
  getCurrentOrCreate: async (clerkId: string) => {
    const user = await createUserRepository(getPersistenceDb()).findByClerkId(
      clerkId,
    );

    if (!user) throw new Error("User not found");

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
