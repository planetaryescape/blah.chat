import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

/**
 * Helper to get current user from context (inlined to avoid calling registered queries)
 */
async function getCurrentUserFromCtx(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

/**
 * Get all Composio connections for the current user
 */
export const listConnections = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserFromCtx(ctx);
    if (!user) return [];

    return ctx.db
      .query("composioConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Get active connections only (for tool building)
 */
export const getActiveConnections = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserFromCtx(ctx);
    if (!user) return [];

    const connections = await ctx.db
      .query("composioConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return connections.filter((c) => c.status === "active");
  },
});

/**
 * Get connection by integration ID
 */
export const getConnectionByIntegration = query({
  args: { integrationId: v.string() },
  handler: async (ctx, { integrationId }) => {
    const user = await getCurrentUserFromCtx(ctx);
    if (!user) return null;

    return ctx.db
      .query("composioConnections")
      .withIndex("by_user_integration", (q) =>
        q.eq("userId", user._id).eq("integrationId", integrationId),
      )
      .first();
  },
});

/**
 * Internal: Create a pending connection (called from OAuth flow)
 */
export const createConnection = internalMutation({
  args: {
    userId: v.id("users"),
    composioConnectionId: v.string(),
    integrationId: v.string(),
    integrationName: v.string(),
    scopes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing connection
    const existing = await ctx.db
      .query("composioConnections")
      .withIndex("by_user_integration", (q) =>
        q.eq("userId", args.userId).eq("integrationId", args.integrationId),
      )
      .first();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        composioConnectionId: args.composioConnectionId,
        status: "initiated",
        scopes: args.scopes,
        lastError: undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new connection
    return ctx.db.insert("composioConnections", {
      userId: args.userId,
      composioConnectionId: args.composioConnectionId,
      integrationId: args.integrationId,
      integrationName: args.integrationName,
      status: "initiated",
      scopes: args.scopes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal: Update connection status (called from OAuth callback)
 */
export const updateConnectionStatus = internalMutation({
  args: {
    composioConnectionId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("initiated"),
      v.literal("active"),
      v.literal("expired"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { composioConnectionId, status, error }) => {
    const connection = await ctx.db
      .query("composioConnections")
      .withIndex("by_composio_connection", (q) =>
        q.eq("composioConnectionId", composioConnectionId),
      )
      .first();

    if (!connection) {
      throw new Error(`Connection not found: ${composioConnectionId}`);
    }

    const now = Date.now();
    await ctx.db.patch(connection._id, {
      status,
      lastError: error,
      connectedAt: status === "active" ? now : connection.connectedAt,
      updatedAt: now,
    });

    return connection._id;
  },
});

/**
 * Internal: Get connection by Composio ID
 */
export const getConnectionByComposioId = internalQuery({
  args: { composioConnectionId: v.string() },
  handler: async (ctx, { composioConnectionId }) => {
    return ctx.db
      .query("composioConnections")
      .withIndex("by_composio_connection", (q) =>
        q.eq("composioConnectionId", composioConnectionId),
      )
      .first();
  },
});

/**
 * Disconnect an integration
 */
export const disconnectIntegration = mutation({
  args: { integrationId: v.string() },
  handler: async (ctx, { integrationId }) => {
    const user = await getCurrentUserFromCtx(ctx);
    if (!user) throw new Error("Not authenticated");

    const connection = await ctx.db
      .query("composioConnections")
      .withIndex("by_user_integration", (q) =>
        q.eq("userId", user._id).eq("integrationId", integrationId),
      )
      .first();

    if (!connection) {
      throw new Error(`Connection not found: ${integrationId}`);
    }

    // Delete the connection record
    await ctx.db.delete(connection._id);

    return { success: true };
  },
});

/**
 * Update last used timestamp
 */
export const markConnectionUsed = internalMutation({
  args: { connectionId: v.id("composioConnections") },
  handler: async (ctx, { connectionId }) => {
    await ctx.db.patch(connectionId, {
      lastUsedAt: Date.now(),
    });
  },
});
