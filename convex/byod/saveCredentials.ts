"use node";

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { encryptCredential } from "../lib/encryption";

/**
 * Save credentials (encrypts before storing)
 * This is an action because encryption requires Node runtime
 */
export const saveCredentials = action({
  args: {
    deploymentUrl: v.string(),
    deployKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    )) as Doc<"users"> | null;

    if (!user) throw new Error("Not authenticated");

    // Validate URL format
    if (!args.deploymentUrl.startsWith("https://")) {
      throw new Error("Deployment URL must start with https://");
    }

    if (!args.deploymentUrl.includes(".convex.cloud")) {
      throw new Error(
        "Deployment URL must be a Convex deployment (*.convex.cloud)",
      );
    }

    // Encrypt credentials
    const encryptedUrl = await encryptCredential(args.deploymentUrl);
    const encryptedKey = await encryptCredential(args.deployKey);

    const now = Date.now();

    // Check if config exists
    const existing = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byod.credentials.getConfigInternal,
      { userId: user._id },
    )) as Doc<"userDatabaseConfig"> | null;

    if (existing) {
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
        internal.byod.credentials.updateConfig,
        {
          configId: existing._id,
          encryptedDeploymentUrl: encryptedUrl.encrypted,
          encryptedDeployKey: encryptedKey.encrypted,
          encryptionIV: `${encryptedUrl.iv}:${encryptedKey.iv}`,
          authTags: `${encryptedUrl.authTag}:${encryptedKey.authTag}`,
          connectionStatus: "pending",
          connectionError: undefined,
          updatedAt: now,
        },
      );
    } else {
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
        internal.byod.credentials.createConfig,
        {
          userId: user._id,
          encryptedDeploymentUrl: encryptedUrl.encrypted,
          encryptedDeployKey: encryptedKey.encrypted,
          encryptionIV: `${encryptedUrl.iv}:${encryptedKey.iv}`,
          authTags: `${encryptedUrl.authTag}:${encryptedKey.authTag}`,
          connectionStatus: "pending",
          schemaVersion: 0,
          createdAt: now,
          updatedAt: now,
        },
      );
    }

    return { success: true };
  },
});
