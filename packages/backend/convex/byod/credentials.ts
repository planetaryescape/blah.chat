import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

// ===== Public Queries =====

/**
 * Get current BYOD config for authenticated user
 * Returns connection status, schema version, etc. (never encrypted credentials)
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const config = await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!config) return null;

    // Never return encrypted credentials to client
    return {
      _id: config._id,
      connectionStatus: config.connectionStatus,
      lastConnectionTest: config.lastConnectionTest,
      connectionError: config.connectionError,
      schemaVersion: config.schemaVersion,
      lastSchemaDeploy: config.lastSchemaDeploy,
      deploymentStatus: config.deploymentStatus,
      deploymentProgress: config.deploymentProgress,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  },
});

// ===== Public Mutations =====

/**
 * Disconnect BYOD (marks config as disconnected, keeps credentials for potential reconnect)
 */
export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const config = await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!config) return { success: true };

    await ctx.db.patch(config._id, {
      connectionStatus: "disconnected",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ===== Internal Queries =====

/**
 * Get config internal (full record with encrypted credentials)
 * For use by other actions that need to decrypt credentials
 */
export const getConfigInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<Doc<"userDatabaseConfig"> | null> => {
    return await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Get all connected configs (for health checks)
 */
export const getConnectedConfigs = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"userDatabaseConfig">[]> => {
    return await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_status", (q) => q.eq("connectionStatus", "connected"))
      .collect();
  },
});

/**
 * Get configs that need migration
 */
export const getOutdatedConfigs = internalQuery({
  args: { targetVersion: v.number() },
  handler: async (ctx, args): Promise<Doc<"userDatabaseConfig">[]> => {
    const configs = await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_status", (q) => q.eq("connectionStatus", "connected"))
      .collect();

    return configs.filter((c) => c.schemaVersion < args.targetVersion);
  },
});

// ===== Internal Mutations =====

/**
 * Create new config (called from saveCredentials action)
 */
export const createConfig = internalMutation({
  args: {
    userId: v.id("users"),
    encryptedDeploymentUrl: v.string(),
    encryptedDeployKey: v.string(),
    encryptionIV: v.string(),
    authTags: v.string(),
    connectionStatus: v.union(
      v.literal("pending"),
      v.literal("connected"),
      v.literal("error"),
      v.literal("disconnected"),
    ),
    schemaVersion: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"userDatabaseConfig">> => {
    return await ctx.db.insert("userDatabaseConfig", args);
  },
});

/**
 * Update existing config (called from actions)
 */
export const updateConfig = internalMutation({
  args: {
    configId: v.id("userDatabaseConfig"),
    encryptedDeploymentUrl: v.optional(v.string()),
    encryptedDeployKey: v.optional(v.string()),
    encryptionIV: v.optional(v.string()),
    authTags: v.optional(v.string()),
    connectionStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("connected"),
        v.literal("error"),
        v.literal("disconnected"),
      ),
    ),
    connectionError: v.optional(v.string()),
    lastConnectionTest: v.optional(v.number()),
    schemaVersion: v.optional(v.number()),
    lastSchemaDeploy: v.optional(v.number()),
    deploymentStatus: v.optional(
      v.union(
        v.literal("not_started"),
        v.literal("deploying"),
        v.literal("deployed"),
        v.literal("failed"),
      ),
    ),
    deploymentProgress: v.optional(v.string()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const { configId, ...updates } = args;
    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );
    await ctx.db.patch(configId, cleanUpdates);
  },
});

/**
 * Delete config (for complete removal)
 */
export const deleteConfig = internalMutation({
  args: { configId: v.id("userDatabaseConfig") },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.delete(args.configId);
  },
});

// ===== Migration Mutations =====

/**
 * Record migration start
 */
export const recordMigrationStart = internalMutation({
  args: {
    userId: v.id("users"),
    migrationId: v.string(),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("byodMigrations")
      .withIndex("by_user_migration", (q) =>
        q.eq("userId", args.userId).eq("migrationId", args.migrationId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "running",
        startedAt: Date.now(),
        error: undefined,
      });
    } else {
      await ctx.db.insert("byodMigrations", {
        userId: args.userId,
        migrationId: args.migrationId,
        version: args.version,
        status: "running",
        startedAt: Date.now(),
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Record migration completion
 */
export const recordMigrationComplete = internalMutation({
  args: {
    userId: v.id("users"),
    migrationId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("byodMigrations")
      .withIndex("by_user_migration", (q) =>
        q.eq("userId", args.userId).eq("migrationId", args.migrationId),
      )
      .first();

    if (record) {
      await ctx.db.patch(record._id, {
        status: "completed",
        completedAt: Date.now(),
      });
    }
  },
});

/**
 * Record migration failure
 */
export const recordMigrationFailed = internalMutation({
  args: {
    userId: v.id("users"),
    migrationId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("byodMigrations")
      .withIndex("by_user_migration", (q) =>
        q.eq("userId", args.userId).eq("migrationId", args.migrationId),
      )
      .first();

    if (record) {
      await ctx.db.patch(record._id, {
        status: "failed",
        error: args.error,
        completedAt: Date.now(),
      });
    }
  },
});

// ===== Migration Queries =====

/**
 * Get migration history for current user
 */
export const getMigrationHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("byodMigrations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/**
 * Get pending migrations count for current user
 */
export const getPendingMigrationsCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return 0;

    const config = await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!config) return 0;

    // Import lazily to avoid circular deps
    const { getMigrationsAfter } = await import("./migrations");
    const currentVersion = config.schemaVersion || 0;
    return getMigrationsAfter(currentVersion).length;
  },
});
