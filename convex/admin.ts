import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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

    return { success: true };
  },
});
