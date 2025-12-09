import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/**
 * Gets or creates a user from Clerk identity (for mutations)
 * Use this at the start of any mutation that needs the current user
 */
export async function getCurrentUserOrCreate(
  ctx: MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  let user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  // Auto-create user if not found (fallback for webhook race condition)
  if (!user) {
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email || "",
      name: identity.name || "Anonymous",
      imageUrl: identity.pictureUrl,
      preferences: {
        theme: "dark",
        defaultModel: "cerebras:qwen-3-32b",
        favoriteModels: [],
        sendOnEnter: true,
      },
      dailyMessageCount: 0,
      lastMessageDate: new Date().toISOString().split("T")[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    user = await ctx.db.get(userId);
    if (!user) throw new Error("Failed to create user");
  }

  return user;
}

/**
 * Gets user from Clerk identity (for queries - read-only)
 * Returns null if user doesn't exist
 */
export async function getCurrentUser(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  return user;
}
