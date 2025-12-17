"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { trackServerEvent } from "../lib/analytics";

/**
 * Send daily heartbeat with anonymous instance metrics
 */
export const sendDailyHeartbeat = internalAction({
  handler: async (ctx) => {
    // Check if telemetry is disabled
    if (process.env.TELEMETRY_DISABLED === "1") {
      return { skipped: true, reason: "TELEMETRY_DISABLED=1" };
    }

    // Debug mode: log what would be sent
    if (process.env.TELEMETRY_DEBUG === "1") {
      let instanceId = await ((ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.telemetry.instanceId.getInstanceId,
      ) as Promise<string | undefined>);

      // Create instance ID if it doesn't exist (even in debug mode)
      if (!instanceId) {
        instanceId = await ((ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.telemetry.instanceId.createInstanceId,
        ) as Promise<string>);
      }

      const stats = await ((ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.telemetry.stats.getDailyStats,
      ) as Promise<{
        messagesLast24h: number;
        activeUsersLast24h: number;
        totalUsers: number;
        featuresEnabled: {
          autoMemoryExtract: boolean;
          hybridSearch: boolean;
          budgetLimits: boolean;
        };
      }>);

      console.log("[Telemetry Debug] Would send:", {
        instanceId,
        version: process.env.APP_VERSION || "unknown",
        deployment: process.env.CONVEX_DEPLOYMENT || "unknown",
        ...stats,
        os: process.platform,
      });

      return { skipped: true, reason: "TELEMETRY_DEBUG=1" };
    }

    try {
      // Get or create instance ID
      let instanceId = await ((ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.telemetry.instanceId.getInstanceId,
      ) as Promise<string | undefined>);

      // Create instance ID if it doesn't exist
      if (!instanceId) {
        instanceId = await ((ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.telemetry.instanceId.createInstanceId,
        ) as Promise<string>);
      }

      // Get daily stats
      const stats = await ((ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.telemetry.stats.getDailyStats,
      ) as Promise<{
        messagesLast24h: number;
        activeUsersLast24h: number;
        totalUsers: number;
        featuresEnabled: {
          autoMemoryExtract: boolean;
          hybridSearch: boolean;
          budgetLimits: boolean;
        };
      }>);

      // Send to PostHog (using existing integration)
      await trackServerEvent(
        "self_hosted_heartbeat",
        {
          instanceId,
          version: process.env.APP_VERSION || "unknown",
          deployment: "self-hosted",
          ...stats,
          os: process.platform,
          nodeVersion: process.version,
        },
        // Use instance ID as distinct_id for grouping
        instanceId,
      );

      return { success: true, instanceId };
    } catch (error) {
      // Fail silently - don't break the app if telemetry fails
      console.error("[Telemetry] Error sending heartbeat:", error);
      return { success: false, error: String(error) };
    }
  },
});
