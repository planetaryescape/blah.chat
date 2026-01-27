"use node";

import { Composio } from "@composio/core";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { action } from "../_generated/server";
import { INTEGRATIONS_BY_ID } from "./constants";

// Cache for auth configs (integration ID -> auth config ID)
const authConfigCache = new Map<string, string>();

/**
 * Get or create an auth config for an integration
 */
async function getOrCreateAuthConfig(
  composio: Composio,
  integrationId: string,
): Promise<string> {
  // Check cache first
  const cached = authConfigCache.get(integrationId);
  if (cached) return cached;

  try {
    // Try to list existing auth configs for this toolkit
    const configs = await composio.authConfigs.list({
      toolkit: integrationId.toUpperCase(),
    });

    // Use existing config if available
    if (configs?.items && configs.items.length > 0) {
      const configId = configs.items[0].id;
      authConfigCache.set(integrationId, configId);
      return configId;
    }
  } catch {
    // Config doesn't exist, create one
  }

  // Create auth config using Composio managed auth
  const config = await composio.authConfigs.create(
    integrationId.toUpperCase(),
    {
      name: `blahchat_${integrationId}`,
      type: "use_composio_managed_auth",
    },
  );

  const configId = config.id;
  authConfigCache.set(integrationId, configId);
  return configId;
}

/**
 * Initialize OAuth flow for an integration
 * Returns a redirect URL for the user to complete OAuth
 */
export const initiateConnection = action({
  args: {
    integrationId: v.string(),
    redirectUrl: v.string(),
  },
  handler: async (ctx, { integrationId, redirectUrl }) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user from DB
    const user = (await (
      ctx.runQuery as (ref: unknown, args: unknown) => Promise<unknown>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserByClerkId,
      { clerkId: identity.subject },
    )) as { _id: string } | null;

    if (!user) {
      throw new Error("User not found");
    }

    // Validate integration exists
    const integration = INTEGRATIONS_BY_ID.get(integrationId);
    if (!integration) {
      throw new Error(`Unknown integration: ${integrationId}`);
    }

    // Get Composio API key
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error("COMPOSIO_API_KEY not configured");
    }

    // Initialize Composio client
    const composio = new Composio({ apiKey });

    // Get or create auth config for this integration
    const authConfigId = await getOrCreateAuthConfig(composio, integrationId);

    // Create unique user ID for Composio
    const composioUserId = `blahchat_${user._id}`;

    // Initiate connection request
    const connectionRequest = await composio.connectedAccounts.initiate(
      composioUserId,
      authConfigId,
      {
        callbackUrl: redirectUrl,
      },
    );

    // Store connection in pending state
    await (
      ctx.runMutation as (ref: unknown, args: unknown) => Promise<unknown>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.composio.connections.createConnection,
      {
        userId: user._id,
        composioConnectionId: connectionRequest.id,
        integrationId,
        integrationName: integration.name,
      },
    );

    return {
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
    };
  },
});

/**
 * Handle OAuth callback - verify connection status
 */
export const verifyConnection = action({
  args: {
    composioConnectionId: v.string(),
  },
  handler: async (ctx, { composioConnectionId }) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get Composio API key
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error("COMPOSIO_API_KEY not configured");
    }

    // Initialize Composio client
    const composio = new Composio({ apiKey });

    try {
      // Check connection status with Composio
      const connection =
        await composio.connectedAccounts.get(composioConnectionId);

      if (connection.status === "ACTIVE") {
        // Update connection as active
        await (
          ctx.runMutation as (ref: unknown, args: unknown) => Promise<unknown>
        )(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.composio.connections.updateConnectionStatus,
          {
            composioConnectionId,
            status: "active",
          },
        );
        return { status: "active" };
      }

      // Still pending or failed
      const status = connection.status === "INITIATED" ? "initiated" : "failed";
      await (
        ctx.runMutation as (ref: unknown, args: unknown) => Promise<unknown>
      )(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.composio.connections.updateConnectionStatus,
        {
          composioConnectionId,
          status,
          error:
            connection.status === "FAILED" ? "OAuth flow failed" : undefined,
        },
      );

      return { status };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await (
        ctx.runMutation as (ref: unknown, args: unknown) => Promise<unknown>
      )(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.composio.connections.updateConnectionStatus,
        {
          composioConnectionId,
          status: "failed",
          error: errorMessage,
        },
      );

      return { status: "failed", error: errorMessage };
    }
  },
});

/**
 * Refresh an expired connection
 */
export const refreshConnection = action({
  args: {
    integrationId: v.string(),
    redirectUrl: v.string(),
  },
  handler: async (ctx, { integrationId, redirectUrl }) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user from DB
    const user = (await (
      ctx.runQuery as (ref: unknown, args: unknown) => Promise<unknown>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserByClerkId,
      { clerkId: identity.subject },
    )) as { _id: string } | null;

    if (!user) {
      throw new Error("User not found");
    }

    // Validate integration exists
    const integration = INTEGRATIONS_BY_ID.get(integrationId);
    if (!integration) {
      throw new Error(`Unknown integration: ${integrationId}`);
    }

    // Get Composio API key
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error("COMPOSIO_API_KEY not configured");
    }

    // Initialize Composio client
    const composio = new Composio({ apiKey });

    // Get or create auth config for this integration
    const authConfigId = await getOrCreateAuthConfig(composio, integrationId);

    // Create unique user ID for Composio
    const composioUserId = `blahchat_${user._id}`;

    // Initiate new connection request (will replace the old one)
    const connectionRequest = await composio.connectedAccounts.initiate(
      composioUserId,
      authConfigId,
      {
        callbackUrl: redirectUrl,
      },
    );

    // Update existing connection record
    await (
      ctx.runMutation as (ref: unknown, args: unknown) => Promise<unknown>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.composio.connections.createConnection,
      {
        userId: user._id,
        composioConnectionId: connectionRequest.id,
        integrationId,
        integrationName: integration.name,
      },
    );

    return {
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
    };
  },
});

/**
 * Disconnect from Composio (revoke access)
 */
export const revokeConnection = action({
  args: {
    integrationId: v.string(),
  },
  handler: async (ctx, { integrationId }) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the connection from DB
    const connection = (await (
      ctx.runQuery as (ref: unknown, args: unknown) => Promise<unknown>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.composio.connections.getConnectionByIntegration,
      { integrationId },
    )) as { composioConnectionId: string } | null;

    if (!connection) {
      throw new Error(`No connection found for ${integrationId}`);
    }

    // Get Composio API key
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (apiKey) {
      try {
        // Initialize Composio and try to delete the connection
        const composio = new Composio({ apiKey });
        await composio.connectedAccounts.delete(
          connection.composioConnectionId,
        );
      } catch {
        // Continue even if Composio deletion fails - still clean up locally
        console.warn(
          `Failed to delete Composio connection for ${integrationId}`,
        );
      }
    }

    // Delete local connection record
    await (
      ctx.runMutation as (ref: unknown, args: unknown) => Promise<unknown>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.composio.connections.disconnectIntegration,
      { integrationId },
    );

    return { success: true };
  },
});
