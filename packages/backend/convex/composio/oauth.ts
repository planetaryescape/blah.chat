"use node";

import { Composio } from "@composio/core";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { INTEGRATIONS_BY_ID } from "./constants";

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
    const user = await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserByClerkId,
      { clerkId: identity.subject },
    );

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

    // Create unique entity ID for this user
    const entityId = `blahchat_${user._id}`;

    // Get or create entity
    const entity = await composio.getEntity(entityId);

    // Initiate connection request
    const connectionRequest = await entity.initiateConnection({
      appName: integrationId,
      redirectUri: redirectUrl,
    });

    // Store connection in pending state
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.composio.connections.createConnection,
      {
        userId: user._id,
        composioConnectionId: connectionRequest.connectionId ?? entityId,
        integrationId,
        integrationName: integration.name,
      },
    );

    return {
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.connectionId,
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
      const connection = await composio.getConnection({
        connectionId: composioConnectionId,
      });

      if (connection.status === "ACTIVE") {
        // Update connection as active
        await (ctx.runMutation as any)(
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
      await (ctx.runMutation as any)(
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

      await (ctx.runMutation as any)(
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
    // Same as initiateConnection - Composio handles re-auth
    return initiateConnection.handler(ctx, { integrationId, redirectUrl });
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

    // Get user from DB
    const user = await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserByClerkId,
      { clerkId: identity.subject },
    );

    if (!user) {
      throw new Error("User not found");
    }

    // Get Composio API key
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error("COMPOSIO_API_KEY not configured");
    }

    // Get the connection from DB
    const connection = await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.composio.connections.getConnectionByIntegration,
      { integrationId },
    );

    if (!connection) {
      throw new Error(`No connection found for ${integrationId}`);
    }

    try {
      // Initialize Composio and revoke
      const composio = new Composio({ apiKey });
      const entityId = `blahchat_${user._id}`;
      const entity = await composio.getEntity(entityId);

      // Try to disconnect from Composio
      await entity.disableConnection({
        connectionId: connection.composioConnectionId,
      });
    } catch {
      // Continue even if Composio revocation fails - still clean up locally
      console.warn(`Failed to revoke Composio connection for ${integrationId}`);
    }

    // Delete local connection record
    await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.composio.connections.disconnectIntegration,
      { integrationId },
    );

    return { success: true };
  },
});
