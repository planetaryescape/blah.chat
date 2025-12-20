"use node";

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { decryptCredential } from "../lib/encryption";

/**
 * Test connection to user's BYOD Convex instance
 * Decrypts credentials and attempts to connect
 */
export const testConnection = action({
  args: {},
  handler: async (ctx) => {
    // Get current user
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    )) as Doc<"users"> | null;

    if (!user) throw new Error("Not authenticated");

    // Get encrypted config
    const config = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byod.credentials.getConfigInternal,
      { userId: user._id },
    )) as Doc<"userDatabaseConfig"> | null;

    if (!config) {
      throw new Error("No BYOD configuration found");
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

      // Attempt connection with timeout
      // Use HTTP API directly since ConvexHttpClient doesn't support admin auth
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), 10000);
      });

      const connectionPromise = (async () => {
        // Query environment variables endpoint (always exists)
        // This validates both URL and deploy key
        const response = await fetch(`${deploymentUrl}/api/run_function`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Convex ${deployKey}`,
          },
          body: JSON.stringify({
            path: "_system/cli/queryEnvironmentVariables",
            args: {},
            format: "json",
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Connection failed: ${response.status} ${text}`);
        }
        return true;
      })();

      await Promise.race([connectionPromise, timeoutPromise]);

      // Update status to connected
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
        internal.byod.credentials.updateConfig,
        {
          configId: config._id,
          connectionStatus: "connected",
          connectionError: undefined,
          lastConnectionTest: Date.now(),
          updatedAt: Date.now(),
        },
      );

      return { success: true, message: "Connection successful" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Provide user-friendly error messages
      let friendlyMessage = errorMessage;
      if (errorMessage.includes("timeout")) {
        friendlyMessage =
          "Connection timed out. Check your deployment URL and try again.";
      } else if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized")
      ) {
        friendlyMessage =
          "Invalid deploy key. Please check your deploy key in Convex dashboard.";
      } else if (
        errorMessage.includes("404") ||
        errorMessage.includes("Not Found")
      ) {
        friendlyMessage =
          "Deployment not found. Check your deployment URL is correct.";
      } else if (errorMessage.includes("ENOTFOUND")) {
        friendlyMessage =
          "Could not reach server. Check your deployment URL is correct.";
      }

      // Update status to error
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
        internal.byod.credentials.updateConfig,
        {
          configId: config._id,
          connectionStatus: "error",
          connectionError: friendlyMessage,
          lastConnectionTest: Date.now(),
          updatedAt: Date.now(),
        },
      );

      return { success: false, message: friendlyMessage };
    }
  },
});

/**
 * Test connection for a specific user (internal, used by health checks)
 */
export const testConnectionInternal = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get encrypted config
    const config = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.byod.credentials.getConfigInternal,
      { userId: args.userId },
    )) as Doc<"userDatabaseConfig"> | null;

    if (!config) {
      return { healthy: false, reason: "no_config" };
    }

    if (config.connectionStatus !== "connected") {
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

      // Test connection
      // Use HTTP API directly since ConvexHttpClient doesn't support admin auth
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), 10000);
      });

      const connectionPromise = (async () => {
        const response = await fetch(`${deploymentUrl}/api/run_function`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Convex ${deployKey}`,
          },
          body: JSON.stringify({
            path: "_system/cli/queryEnvironmentVariables",
            args: {},
            format: "json",
          }),
        });

        if (!response.ok) {
          throw new Error(`Connection failed: ${response.status}`);
        }
        return true;
      })();

      await Promise.race([connectionPromise, timeoutPromise]);

      // Update last connection test
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
        internal.byod.credentials.updateConfig,
        {
          configId: config._id,
          lastConnectionTest: Date.now(),
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
