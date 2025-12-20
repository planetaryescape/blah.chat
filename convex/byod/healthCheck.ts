"use node";

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { decryptCredential } from "../lib/encryption";

/**
 * Check health of a single user's BYOD instance
 */
export const checkUserHealth = internalAction({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const config = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.byod.credentials.getConfigInternal,
			{ userId: args.userId },
		)) as Doc<"userDatabaseConfig"> | null;

		if (!config || config.connectionStatus !== "connected") {
			return { healthy: true, reason: "not_connected" };
		}

		try {
			// Decrypt credentials
			const [urlIv, keyIv] = config.encryptionIV.split(":");
			const [urlAuthTag, keyAuthTag] = config.authTags.split(":");

			const deploymentUrl = await decryptCredential(
				config.encryptedDeploymentUrl,
				urlIv,
				urlAuthTag,
			);

			const deployKey = await decryptCredential(
				config.encryptedDeployKey,
				keyIv,
				keyAuthTag,
			);

			// Test connection using HTTP API
			const response = await fetch(`${deploymentUrl}/api/run_function`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Convex ${deployKey}`,
				},
				body: JSON.stringify({
					path: "functions:ping",
					args: {},
					format: "json",
				}),
			});

			if (!response.ok) {
				throw new Error(`Connection failed: ${response.status}`);
			}

			// Update last connection test
			await (ctx.runMutation as any)(
				// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
				internal.byod.credentials.updateConfig,
				{
					configId: config._id,
					lastConnectionTest: Date.now(),
					connectionError: undefined,
					updatedAt: Date.now(),
				},
			);

			return { healthy: true, reason: "connected" };
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			// Update status to error
			await (ctx.runMutation as any)(
				// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
				internal.byod.credentials.updateConfig,
				{
					configId: config._id,
					connectionStatus: "error",
					connectionError: errorMessage,
					lastConnectionTest: Date.now(),
					updatedAt: Date.now(),
				},
			);

			return { healthy: false, reason: errorMessage };
		}
	},
});

/**
 * Check all BYOD instances (scheduled job)
 */
export const checkAllHealth = internalAction({
	args: {},
	handler: async (ctx) => {
		// Get all connected configs
		const configs = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.byod.credentials.getConnectedConfigs,
			{},
		)) as Doc<"userDatabaseConfig">[];

		const results = {
			total: configs.length,
			healthy: 0,
			unhealthy: 0,
			errors: [] as { userId: Id<"users">; error: string }[],
		};

		for (const config of configs) {
			const result = (await (ctx.runAction as any)(
				// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
				internal.byod.healthCheck.checkUserHealth,
				{ userId: config.userId },
			)) as { healthy: boolean; reason: string };

			if (result.healthy) {
				results.healthy++;
			} else {
				results.unhealthy++;
				results.errors.push({
					userId: config.userId,
					error: result.reason,
				});
			}
		}

		return results;
	},
});
