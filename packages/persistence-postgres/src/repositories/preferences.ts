import { and, eq } from "drizzle-orm";
import type { PersistenceDb } from "../db";
import { userPreferences, users } from "../schema";

export function createPreferenceRepository(db: PersistenceDb) {
  return {
    async getAllForClerkId(clerkId: string) {
      const rows = await db
        .select({
          key: userPreferences.key,
          value: userPreferences.value,
        })
        .from(userPreferences)
        .innerJoin(users, eq(users.id, userPreferences.userId))
        .where(eq(users.clerkId, clerkId));

      return Object.fromEntries(
        rows.map((row) => [row.key, row.value]),
      ) as Record<string, unknown>;
    },

    async getForClerkId(clerkId: string, key: string) {
      const row = await db
        .select({
          value: userPreferences.value,
        })
        .from(userPreferences)
        .innerJoin(users, eq(users.id, userPreferences.userId))
        .where(and(eq(users.clerkId, clerkId), eq(userPreferences.key, key)))
        .limit(1);

      return row[0]?.value;
    },

    async setForUser(userId: string, key: string, value: unknown) {
      const timestamp = Date.now();
      await db
        .insert(userPreferences)
        .values({
          userId,
          key,
          value,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .onConflictDoUpdate({
          target: [userPreferences.userId, userPreferences.key],
          set: {
            value,
            updatedAt: timestamp,
          },
        });

      const row = await db.query.userPreferences.findFirst({
        where: and(
          eq(userPreferences.userId, userId),
          eq(userPreferences.key, key),
        ),
      });

      if (!row) {
        throw new Error(
          `Failed to persist preference for userId=${userId} key=${key}`,
        );
      }

      return row;
    },
  };
}
