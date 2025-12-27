import { v } from "convex/values";
import { BYOD_SCHEMA_VERSION } from "@/lib/byod/version";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, query } from "../_generated/server";

/**
 * Get BYOD statistics for admin dashboard
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    // Verify admin access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Get all configs
    const configs = await ctx.db.query("userDatabaseConfig").collect();

    // Count by status and version
    const stats = {
      total: configs.length,
      connected: 0,
      pending: 0,
      error: 0,
      disconnected: 0,
      pendingMigrations: 0,
      latestVersion: BYOD_SCHEMA_VERSION,
      versionDistribution: {} as Record<string, number>,
    };

    for (const config of configs) {
      // Track version distribution
      const version = config.schemaVersion || 0;
      const versionKey = `v${version}`;
      stats.versionDistribution[versionKey] =
        (stats.versionDistribution[versionKey] || 0) + 1;

      switch (config.connectionStatus) {
        case "connected":
          stats.connected++;
          // Check if needs migration
          if (version < BYOD_SCHEMA_VERSION) {
            stats.pendingMigrations++;
          }
          break;
        case "pending":
          stats.pending++;
          break;
        case "error":
          stats.error++;
          break;
        case "disconnected":
          stats.disconnected++;
          break;
      }
    }

    return stats;
  },
});

/**
 * Send update notifications to all outdated BYOD users
 */
export const sendUpdateNotifications = action({
  args: {},
  handler: async (ctx) => {
    // Get all connected configs with outdated versions
    const configs = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byod.credentials.getOutdatedConfigs,
      { targetVersion: BYOD_SCHEMA_VERSION },
    )) as Doc<"userDatabaseConfig">[];

    const results = {
      total: configs.length,
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    for (const config of configs) {
      try {
        // Get user email
        const user = (await (ctx.runQuery as any)(
          // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
          internal.users.getById,
          { userId: config.userId },
        )) as Doc<"users"> | null;

        if (!user?.email) {
          results.skipped++;
          continue;
        }

        await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
          internal.emails.utils.send.sendBYODUpdateNotification,
          {
            userId: config.userId,
            userEmail: user.email,
            currentVersion: config.schemaVersion || 0,
            latestVersion: BYOD_SCHEMA_VERSION,
          },
        );
        results.sent++;
      } catch {
        results.failed++;
      }
    }

    return results;
  },
});

/**
 * List all BYOD instances for admin dashboard
 */
export const listInstances = query({
  args: {},
  handler: async (ctx) => {
    // Verify admin access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get all configs
    const configs = await ctx.db.query("userDatabaseConfig").collect();

    // Enrich with user info
    const instances = await Promise.all(
      configs.map(async (config) => {
        const user = await ctx.db.get(config.userId);
        return {
          _id: config._id,
          userId: config.userId,
          userEmail: user?.email || null,
          connectionStatus: config.connectionStatus,
          schemaVersion: config.schemaVersion,
          lastConnectionTest: config.lastConnectionTest,
          connectionError: config.connectionError,
          deploymentStatus: config.deploymentStatus,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        };
      }),
    );

    // Sort by status (errors first) then by last updated
    return instances.sort((a, b) => {
      // Errors first
      if (a.connectionStatus === "error" && b.connectionStatus !== "error")
        return -1;
      if (b.connectionStatus === "error" && a.connectionStatus !== "error")
        return 1;
      // Then by updated date
      return b.updatedAt - a.updatedAt;
    });
  },
});

/**
 * Get details for a specific BYOD instance
 */
export const getInstance = query({
  args: { configId: v.id("userDatabaseConfig") },
  handler: async (ctx, args) => {
    // Verify admin access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const config = await ctx.db.get(args.configId);
    if (!config) return null;

    const user = await ctx.db.get(config.userId);

    // Get migration history
    const migrations = await ctx.db
      .query("byodMigrations")
      .withIndex("by_user", (q) => q.eq("userId", config.userId))
      .order("desc")
      .collect();

    return {
      config: {
        _id: config._id,
        userId: config.userId,
        connectionStatus: config.connectionStatus,
        schemaVersion: config.schemaVersion,
        lastConnectionTest: config.lastConnectionTest,
        connectionError: config.connectionError,
        deploymentStatus: config.deploymentStatus,
        deploymentProgress: config.deploymentProgress,
        lastSchemaDeploy: config.lastSchemaDeploy,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
      user: user
        ? {
            _id: user._id,
            email: user.email,
            name: user.name,
          }
        : null,
      migrations,
    };
  },
});
