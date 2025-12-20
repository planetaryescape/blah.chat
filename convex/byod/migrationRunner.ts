"use node";

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { decryptCredential } from "../lib/encryption";
import { BYOD_SCHEMA_VERSION } from "../../src/lib/byod/version";
import { getMigrationsAfter, type MigrationContext } from "./migrations";

/**
 * Run pending migrations for a single user
 */
export const runMigrationsForUser = action({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		// Get user's BYOD config
		const config = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.byod.credentials.getConfigInternal,
			{ userId: args.userId },
		)) as Doc<"userDatabaseConfig"> | null;

		if (!config || config.connectionStatus !== "connected") {
			return { success: false, message: "User not BYOD or not connected" };
		}

		const currentVersion = config.schemaVersion || 0;
		const pendingMigrations = getMigrationsAfter(currentVersion);

		if (pendingMigrations.length === 0) {
			return { success: true, message: "Already up to date" };
		}

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

		// Get user's clerk ID
		const user = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.users.getById,
			{ userId: args.userId },
		)) as Doc<"users"> | null;

		const migrationCtx: MigrationContext = {
			deploymentUrl,
			deployKey,
			userId: args.userId,
			clerkId: user?.clerkId || "",
		};

		// Run migrations in order
		for (const migration of pendingMigrations) {
			// Record migration start
			await (ctx.runMutation as any)(
				// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
				internal.byod.credentials.recordMigrationStart,
				{
					userId: args.userId,
					migrationId: migration.id,
					version: migration.version,
				},
			);

			try {
				// Run migration logic
				await migration.up(migrationCtx);

				// Record success
				await (ctx.runMutation as any)(
					// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
					internal.byod.credentials.recordMigrationComplete,
					{
						userId: args.userId,
						migrationId: migration.id,
					},
				);

				// Update schema version
				await (ctx.runMutation as any)(
					// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
					internal.byod.credentials.updateConfig,
					{
						configId: config._id,
						schemaVersion: migration.version,
						updatedAt: Date.now(),
					},
				);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";

				// Record failure
				await (ctx.runMutation as any)(
					// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
					internal.byod.credentials.recordMigrationFailed,
					{
						userId: args.userId,
						migrationId: migration.id,
						error: errorMessage,
					},
				);

				return {
					success: false,
					message: `Migration ${migration.id} failed: ${errorMessage}`,
					failedAt: migration.id,
				};
			}
		}

		return {
			success: true,
			message: `Completed ${pendingMigrations.length} migrations`,
			newVersion: BYOD_SCHEMA_VERSION,
		};
	},
});

/**
 * Run migrations for all BYOD users (admin action)
 */
export const runMigrationsForAll = action({
	args: {},
	handler: async (ctx) => {
		// Get all connected BYOD configs that need migration
		const configs = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.byod.credentials.getOutdatedConfigs,
			{ targetVersion: BYOD_SCHEMA_VERSION },
		)) as Doc<"userDatabaseConfig">[];

		const results = {
			total: configs.length,
			succeeded: 0,
			failed: 0,
			skipped: 0,
			errors: [] as { userId: Id<"users">; error: string }[],
		};

		for (const config of configs) {
			try {
				const result = (await (ctx.runAction as any)(
					// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
					internal.byod.migrationRunner.runMigrationsForUser,
					{ userId: config.userId },
				)) as { success: boolean; message: string };

				if (result.success) {
					results.succeeded++;
				} else {
					results.failed++;
					results.errors.push({
						userId: config.userId,
						error: result.message,
					});
				}
			} catch (error) {
				results.failed++;
				results.errors.push({
					userId: config.userId,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		return results;
	},
});
