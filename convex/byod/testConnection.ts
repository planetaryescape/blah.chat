"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { decryptCredential } from "../lib/encryption";

interface PingResponse {
  status: string;
  version: number;
  timestamp: number;
}

/**
 * Test connection to user's BYOD Convex instance
 * Decrypts credentials and attempts to connect
 * Also verifies schema deployment by calling the ping function
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
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), 10000);
      });

      // First verify basic connectivity with system endpoint
      const connectivityPromise = (async () => {
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

      await Promise.race([connectivityPromise, timeoutPromise]);

      // Now verify schema deployment by calling ping function
      let schemaVersion: number | undefined;
      try {
        const pingPromise = (async () => {
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

          if (response.ok) {
            const data = (await response.json()) as PingResponse;
            return data.version;
          }
          return undefined;
        })();

        schemaVersion = await Promise.race([
          pingPromise,
          new Promise<undefined>((resolve) =>
            setTimeout(() => resolve(undefined), 5000),
          ),
        ]);
      } catch {
        // Ping function not available - schema not deployed yet
      }

      // Update status based on whether schema is deployed
      const isSchemaDeployed = schemaVersion !== undefined;

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
        internal.byod.credentials.updateConfig,
        {
          configId: config._id,
          connectionStatus: "connected",
          connectionError: undefined,
          lastConnectionTest: Date.now(),
          ...(isSchemaDeployed && {
            deploymentStatus: "deployed",
            deploymentProgress: "Deployment verified",
            schemaVersion,
            lastSchemaDeploy: Date.now(),
          }),
          updatedAt: Date.now(),
        },
      );

      if (isSchemaDeployed) {
        return {
          success: true,
          message: `Deployment verified (v${schemaVersion})`,
          schemaVersion,
        };
      }

      return {
        success: true,
        message:
          "Connection successful, but schema not deployed yet. Run 'bunx convex deploy' in your project folder.",
        schemaVersion: undefined,
      };
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
