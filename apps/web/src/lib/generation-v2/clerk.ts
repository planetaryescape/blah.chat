import { currentUser } from "@clerk/nextjs/server";
import type { ClerkUserProfile } from "./types";

export async function getCurrentClerkUserProfile(): Promise<ClerkUserProfile> {
  const user = await currentUser();
  if (!user) {
    throw new Error("Authenticated user not found");
  }

  const email =
    user.primaryEmailAddress?.emailAddress ?? `${user.id}@clerk.local`;
  const name =
    user.fullName?.trim() ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    "Anonymous";

  return {
    clerkId: user.id,
    email,
    name,
    imageUrl: user.imageUrl,
  };
}
