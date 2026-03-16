import { eq } from "drizzle-orm";
import type { PersistenceDb } from "../db";
import { users } from "../schema";

export interface ClerkIdentityInput {
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
}

export function createUserRepository(db: PersistenceDb) {
  return {
    async upsertFromClerk(input: ClerkIdentityInput) {
      const timestamp = Date.now();

      await db
        .insert(users)
        .values({
          clerkId: input.clerkId,
          email: input.email,
          name: input.name,
          imageUrl: input.imageUrl,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: input.email,
            name: input.name,
            imageUrl: input.imageUrl,
            updatedAt: timestamp,
          },
        });

      const row = await db.query.users.findFirst({
        where: eq(users.clerkId, input.clerkId),
      });
      if (!row) {
        throw new Error(`Failed to upsert user for clerkId=${input.clerkId}`);
      }
      return row;
    },
  };
}
