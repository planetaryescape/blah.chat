import { createUserRepository } from "@blah-chat/persistence-postgres";
import { currentUser } from "@clerk/nextjs/server";
import { getPersistenceDb } from "./server";

export async function ensureCurrentPersistenceUser(expectedClerkId: string) {
  const user = await currentUser();
  if (!user || user.id !== expectedClerkId) {
    throw new Error("Authenticated user not found");
  }

  const users = createUserRepository(getPersistenceDb());
  return users.upsertFromClerk({
    clerkId: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? `${user.id}@clerk.local`,
    name:
      user.fullName?.trim() ||
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      "Anonymous",
    imageUrl: user.imageUrl,
  });
}
