"use node";

import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { decryptCredential } from "../lib/encryption";
import { BYOD_SCHEMA_VERSION } from "../../src/lib/byod/version";
import { generateSchemaFile } from "../../src/lib/byod/schemaGenerator";

/**
 * Deploy BYOD schema to user's Convex instance
 */
export const deployToUserInstance = action({
	args: {},
	handler: async (ctx) => {
		// Get current user
		const user = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.lib.helpers.getCurrentUser,
			{},
		)) as Doc<"users"> | null;

		if (!user) throw new Error("Not authenticated");

		// Get config
		const config = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.byod.credentials.getConfigInternal,
			{ userId: user._id },
		)) as Doc<"userDatabaseConfig"> | null;

		if (!config) {
			throw new Error("No BYOD configuration found");
		}

		// Update status to deploying
		await (ctx.runMutation as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.byod.credentials.updateConfig,
			{
				configId: config._id,
				deploymentStatus: "deploying",
				deploymentProgress: "Preparing deployment...",
				updatedAt: Date.now(),
			},
		);

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

			// Update progress
			await (ctx.runMutation as any)(
				// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
				internal.byod.credentials.updateConfig,
				{
					configId: config._id,
					deploymentProgress: "Generating schema files...",
					updatedAt: Date.now(),
				},
			);

			// Create temporary project directory
			const tempDir = join(
				tmpdir(),
				`byod-deploy-${user._id}-${Date.now()}`,
			);
			mkdirSync(tempDir, { recursive: true });

			try {
				// Generate and write project files
				await generateProjectFiles(tempDir);

				// Update progress
				await (ctx.runMutation as any)(
					// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
					internal.byod.credentials.updateConfig,
					{
						configId: config._id,
						deploymentProgress: "Deploying to Convex...",
						updatedAt: Date.now(),
					},
				);

				// Run deployment
				await runConvexDeploy(tempDir, deploymentUrl, deployKey);

				// Update status to deployed
				await (ctx.runMutation as any)(
					// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
					internal.byod.credentials.updateConfig,
					{
						configId: config._id,
						connectionStatus: "connected",
						deploymentStatus: "deployed",
						deploymentProgress: "Deployment complete",
						schemaVersion: BYOD_SCHEMA_VERSION,
						lastSchemaDeploy: Date.now(),
						connectionError: undefined,
						updatedAt: Date.now(),
					},
				);

				return { success: true, message: "Deployment successful" };
			} finally {
				// Cleanup temp directory
				rmSync(tempDir, { recursive: true, force: true });
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			// Update status to failed
			await (ctx.runMutation as any)(
				// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
				internal.byod.credentials.updateConfig,
				{
					configId: config._id,
					deploymentStatus: "failed",
					deploymentProgress: `Deployment failed: ${errorMessage}`,
					connectionError: errorMessage,
					updatedAt: Date.now(),
				},
			);

			throw new Error(`Deployment failed: ${errorMessage}`);
		}
	},
});

/**
 * Retry a failed deployment
 */
export const retryDeployment = action({
	args: {},
	handler: async (ctx): Promise<{ success: boolean; message: string }> => {
		// Get current user
		const user = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.lib.helpers.getCurrentUser,
			{},
		)) as Doc<"users"> | null;

		if (!user) throw new Error("Not authenticated");

		const config = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.byod.credentials.getConfigInternal,
			{ userId: user._id },
		)) as Doc<"userDatabaseConfig"> | null;

		if (!config) {
			throw new Error("No BYOD configuration found");
		}

		if (config.deploymentStatus !== "failed") {
			throw new Error("Can only retry failed deployments");
		}

		// Reset status and retry
		await (ctx.runMutation as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.byod.credentials.updateConfig,
			{
				configId: config._id,
				deploymentStatus: "not_started",
				deploymentProgress: undefined,
				connectionError: undefined,
				updatedAt: Date.now(),
			},
		);

		// Call the main deploy action
		return await (ctx.runAction as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.byod.deploy.deployToUserInstance,
			{},
		);
	},
});

/**
 * Get deployment status
 */
export const getDeploymentStatus = action({
	args: {},
	handler: async (ctx) => {
		// Get current user
		const user = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.lib.helpers.getCurrentUser,
			{},
		)) as Doc<"users"> | null;

		if (!user) return null;

		const config = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit with 85+ Convex modules
			internal.byod.credentials.getConfigInternal,
			{ userId: user._id },
		)) as Doc<"userDatabaseConfig"> | null;

		if (!config) return null;

		return {
			status: config.deploymentStatus,
			progress: config.deploymentProgress,
			schemaVersion: config.schemaVersion,
			lastDeploy: config.lastSchemaDeploy,
		};
	},
});

// ===== Helper Functions =====

/**
 * Generate project files in temp directory
 */
async function generateProjectFiles(dir: string): Promise<void> {
	// Create convex directory
	const convexDir = join(dir, "convex");
	mkdirSync(convexDir, { recursive: true });

	// Write package.json
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify(
			{
				name: "blah-chat-byod",
				version: "1.0.0",
				private: true,
				dependencies: {
					convex: "^1.17.0",
				},
			},
			null,
			2,
		),
	);

	// Write convex.json (minimal config)
	writeFileSync(
		join(dir, "convex.json"),
		JSON.stringify(
			{
				functions: "convex/",
			},
			null,
			2,
		),
	);

	// Write schema.ts using the generator from Phase 2
	const schemaContent = generateSchemaFile();
	writeFileSync(join(convexDir, "schema.ts"), schemaContent);

	// Write minimal functions.ts
	const functionsContent = generateMinimalFunctions();
	writeFileSync(join(convexDir, "functions.ts"), functionsContent);

	// Write tsconfig.json
	writeFileSync(
		join(dir, "tsconfig.json"),
		JSON.stringify(
			{
				compilerOptions: {
					target: "ESNext",
					module: "ESNext",
					moduleResolution: "bundler",
					strict: true,
					skipLibCheck: true,
				},
				include: ["convex/**/*"],
			},
			null,
			2,
		),
	);
}

/**
 * Run convex deploy command
 */
function runConvexDeploy(
	dir: string,
	url: string,
	deployKey: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const env = {
			...process.env,
			CONVEX_DEPLOY_KEY: deployKey,
		};

		const child = spawn("npx", ["convex", "deploy", "--url", url, "--yes"], {
			cwd: dir,
			env,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		child.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Deploy failed (code ${code}): ${stderr || stdout}`));
			}
		});

		child.on("error", (err) => {
			reject(new Error(`Failed to start deploy: ${err.message}`));
		});

		// Timeout after 5 minutes
		const timeout = setTimeout(() => {
			child.kill();
			reject(new Error("Deployment timed out after 5 minutes"));
		}, 5 * 60 * 1000);

		child.on("close", () => {
			clearTimeout(timeout);
		});
	});
}

/**
 * Generate minimal functions for basic CRUD and health check
 */
function generateMinimalFunctions(): string {
	return `// BYOD Functions v${BYOD_SCHEMA_VERSION}
// Auto-generated by blah.chat - DO NOT EDIT

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Health check - used to verify connection
export const ping = query({
  args: {},
  handler: async () => {
    return { status: "ok", version: ${BYOD_SCHEMA_VERSION}, timestamp: Date.now() };
  },
});

// System info - returns schema version
export const getSystemInfo = query({
  args: {},
  handler: async () => {
    return {
      schemaVersion: ${BYOD_SCHEMA_VERSION},
      provider: "blah.chat",
      type: "byod",
    };
  },
});
`;
}
