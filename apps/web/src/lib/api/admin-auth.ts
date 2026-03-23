import { currentUser } from "@clerk/nextjs/server";

export async function requireCurrentAdmin(clerkUserId: string) {
  const user = await currentUser();
  const isAdmin =
    user?.id === clerkUserId &&
    (user.publicMetadata as { isAdmin?: boolean } | undefined)?.isAdmin ===
      true;

  if (!isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  return user;
}
