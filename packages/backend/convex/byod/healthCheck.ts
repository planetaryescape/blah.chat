"use node";

import { v } from "convex/values";
import { BYOD_SCHEMA_VERSION } from "@/lib/byod/version";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { decryptCredential } from "../lib/encryption";

interface PingResponse {
  status: string;
  version: number;
  timestamp: number;
}

interface HealthCheckResult {
  healthy: boolean;
  reason: string;
  remoteVersion?: number;
  needsUpdate?: boolean;
}

/**
 * Check health of a single user's BYOD instance
 */
export const checkUserHealth = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<HealthCheckResult> => {
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

      // Parse response to get remote version
      let remoteVersion: number | undefined;
      try {
        const data = (await response.json()) as PingResponse;
        remoteVersion = data.version;
      } catch {
        // Couldn't parse version, but connection still works
      }

      const needsUpdate =
        remoteVersion !== undefined && remoteVersion < BYOD_SCHEMA_VERSION;

      // Update last connection test and schema version
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
        internal.byod.credentials.updateConfig,
        {
          configId: config._id,
          lastConnectionTest: Date.now(),
          connectionError: undefined,
          ...(remoteVersion !== undefined && { schemaVersion: remoteVersion }),
          updatedAt: Date.now(),
        },
      );

      return {
        healthy: true,
        reason: needsUpdate ? "outdated" : "connected",
        remoteVersion,
        needsUpdate,
      };
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
      outdated: 0,
      emailsSent: 0,
      latestVersion: BYOD_SCHEMA_VERSION,
      errors: [] as { userId: Id<"users">; error: string }[],
      outdatedUsers: [] as { userId: Id<"users">; version: number }[],
    };

    for (const config of configs) {
      const result = (await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
        internal.byod.healthCheck.checkUserHealth,
        { userId: config.userId },
      )) as HealthCheckResult;

      if (result.healthy) {
        results.healthy++;
        if (result.needsUpdate && result.remoteVersion !== undefined) {
          results.outdated++;
          results.outdatedUsers.push({
            userId: config.userId,
            version: result.remoteVersion,
          });

          // Get user email and send notification
          try {
            const user = (await (ctx.runQuery as any)(
              // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
              internal.users.getById,
              { userId: config.userId },
            )) as Doc<"users"> | null;

            if (user?.email) {
              await (ctx.runAction as any)(
                // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
                internal.emails.utils.send.sendBYODUpdateNotification,
                {
                  userId: config.userId,
                  userEmail: user.email,
                  currentVersion: result.remoteVersion,
                  latestVersion: BYOD_SCHEMA_VERSION,
                },
              );
              results.emailsSent++;
            }
          } catch (error) {
            const { logger } = await import("../lib/logger");
            logger.error("Failed to send update email to user", {
              tag: "BYOD",
              userId: config.userId,
              error: String(error),
            });
          }
        }
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
