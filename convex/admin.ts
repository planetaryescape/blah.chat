import { v } from "convex/values";
import { internalAction, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./lib/userSync";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Check if the current user is an admin
 */
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;
    return user.isAdmin === true;
  },
});

/**
 * List all users (admin only)
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      imageUrl: u.imageUrl,
      isAdmin: u.isAdmin ?? false,
      createdAt: u.createdAt,
    }));
  },
});

/**
 * Get total user count (admin only)
 */
export const getUserCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    const users = await ctx.db.query("users").collect();
    return users.length;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update a user's admin role (admin only)
 * Also syncs admin status to Clerk publicMetadata for middleware access
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, { userId, isAdmin }) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser.isAdmin !== true) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Prevent removing own admin status
    if (userId === currentUser._id && !isAdmin) {
      throw new Error("Cannot remove your own admin status");
    }

    await ctx.db.patch(userId, {
      isAdmin,
      updatedAt: Date.now(),
    });

    // Sync admin status to Clerk publicMetadata for middleware access
    const targetUser = await ctx.db.get(userId);
    if (targetUser?.clerkId) {
      await (ctx.scheduler.runAfter as any)(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.admin.syncAdminToClerk,
        {
          clerkId: targetUser.clerkId,
          isAdmin,
        }
      );
    }

    return { success: true };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Sync admin status to Clerk publicMetadata
 * Called after updateUserRole to keep Clerk session claims in sync
 */
export const syncAdminToClerk = internalAction({
  args: {
    clerkId: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (_ctx, { clerkId, isAdmin }) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not configured");
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${clerkId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_metadata: { isAdmin },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to sync admin to Clerk: ${error}`);
    }

    return { success: true };
  },
});
