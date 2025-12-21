"use node";

import { BYOD_SCHEMA_VERSION } from "../../src/lib/byod/version";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action } from "../_generated/server";

/**
 * Get deployment status for the current user
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
      latestVersion: BYOD_SCHEMA_VERSION,
      needsUpdate: (config.schemaVersion || 0) < BYOD_SCHEMA_VERSION,
      lastDeploy: config.lastSchemaDeploy,
    };
  },
});

/**
 * Mark deployment as verified after user deploys manually
 * Called by testConnection when ping succeeds
 */
export const markDeploymentVerified = action({
  args: {},
  handler: async (ctx) => {
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

    if (!config) throw new Error("No BYOD configuration found");

    // Update status to connected/deployed
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byod.credentials.updateConfig,
      {
        configId: config._id,
        connectionStatus: "connected",
        deploymentStatus: "deployed",
        deploymentProgress: "Deployment verified",
        lastConnectionTest: Date.now(),
        connectionError: undefined,
        updatedAt: Date.now(),
      },
    );

    return { success: true };
  },
});
