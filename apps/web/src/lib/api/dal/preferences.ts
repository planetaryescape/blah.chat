import "server-only";
import {
  createPreferenceRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { z } from "zod";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";

const updatePreferenceSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

async function getPersistenceUser(clerkId: string) {
  const user = await createUserRepository(getPersistenceDb()).findByClerkId(
    clerkId,
  );
  if (!user) {
    throw new Error("Access denied");
  }
  return user;
}

export const preferencesDAL = {
  get: async (userId: string, key: string) => {
    const db = getPersistenceDb();
    await getPersistenceUser(userId);
    const value = await createPreferenceRepository(db).getForClerkId(
      userId,
      key,
    );

    return formatEntity({ key, value }, "preference");
  },

  getAll: async (userId: string) => {
    const db = getPersistenceDb();
    await getPersistenceUser(userId);
    const preferences =
      await createPreferenceRepository(db).getAllForClerkId(userId);

    return formatEntity(preferences, "preferences");
  },

  update: async (
    userId: string,
    data: z.infer<typeof updatePreferenceSchema>,
  ) => {
    const validated = updatePreferenceSchema.parse(data);
    const db = getPersistenceDb();
    const user = await getPersistenceUser(userId);
    await createPreferenceRepository(db).setForUser(
      user.id,
      validated.key,
      validated.value,
    );

    return formatEntity(
      { key: validated.key, value: validated.value },
      "preference",
    );
  },
};
