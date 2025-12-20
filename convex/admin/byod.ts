import { v } from "convex/values";
import { query } from "../_generated/server";
import { BYOD_SCHEMA_VERSION } from "../../src/lib/byod/version";

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

		// Count by status
		const stats = {
			total: configs.length,
			connected: 0,
			pending: 0,
			error: 0,
			disconnected: 0,
			pendingMigrations: 0,
		};

		for (const config of configs) {
			switch (config.connectionStatus) {
				case "connected":
					stats.connected++;
					// Check if needs migration
					if ((config.schemaVersion || 0) < BYOD_SCHEMA_VERSION) {
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
