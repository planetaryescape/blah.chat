"use node";

import { randomBytes } from "node:crypto";
import { Composio } from "@composio/core";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { action } from "../_generated/server";
import { INTEGRATIONS_BY_ID } from "./constants";

/**
 * Generate a cryptographically secure random state for CSRF protection
 */
function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

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

  // Normalize toolkit name to lowercase (Composio SDK expects lowercase)
  const normalizedToolkit = integrationId.toLowerCase();

  try {
    // Try to list existing auth configs for this toolkit
    const configs = await composio.authConfigs.list({
      toolkit: normalizedToolkit,
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
  const config = await composio.authConfigs.create(normalizedToolkit, {
    name: `blahchat_${normalizedToolkit}`,
    type: "use_composio_managed_auth",
  });

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

    // Check if this is a re-connection (existing connection for this integration)
    const existingConnection = (await (
      ctx.runQuery as (ref: unknown, args: unknown) => Promise<unknown>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.composio.connections.getConnectionByIntegration,
      { integrationId },
    )) as { _id: string } | null;

    if (!existingConnection) {
      // New connection - check limit
      const activeConnections = (await (
        ctx.runQuery as (ref: unknown, args: unknown) => Promise<unknown>
      )(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        api.composio.connections.getActiveConnections,
        {},
      )) as unknown[];

      // Get max integrations from admin settings
      const maxIntegrations = (await (
        ctx.runQuery as (ref: unknown, args: unknown) => Promise<number>
      )(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.adminSettings.getMaxActiveIntegrations,
        {},
      )) as number;

      if (activeConnections.length >= maxIntegrations) {
        throw new Error(
          `Integration limit reached. You can connect up to ${maxIntegrations} integrations. Disconnect one to add another.`,
        );
      }
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

    // Generate CSRF state for security
    const oauthState = generateOAuthState();

    // Include state in callback URL so it's returned after OAuth
    const callbackWithState = `${redirectUrl}${redirectUrl.includes("?") ? "&" : "?"}state=${oauthState}`;

    // Initiate connection request
    // allowMultiple: true allows re-connecting (Manage button) or multiple accounts
    const connectionRequest = await composio.connectedAccounts.initiate(
      composioUserId,
      authConfigId,
      {
        callbackUrl: callbackWithState,
        allowMultiple: true,
      },
    );

    // Store connection in pending state with CSRF state
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
        oauthState,
      },
    );

    return {
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
      // Return state so frontend can pass it back for validation
      state: oauthState,
    };
  },
});

/**
 * Handle OAuth callback - verify connection status
 */
export const verifyConnection = action({
  args: {
    composioConnectionId: v.string(),
    // CSRF state validation
    state: v.optional(v.string()),
  },
  handler: async (ctx, { composioConnectionId, state }) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user from DB to get userId
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

    // SECURITY: Verify the connection belongs to this user before updating
    const existingConnection = (await (
      ctx.runQuery as (ref: unknown, args: unknown) => Promise<unknown>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.composio.connections.getConnectionByComposioId,
      { composioConnectionId },
    )) as {
      userId: string;
      oauthState?: string;
      oauthStateExpiresAt?: number;
    } | null;

    if (!existingConnection) {
      throw new Error("Connection not found");
    }

    if (existingConnection.userId !== user._id) {
      throw new Error("Unauthorized: Connection belongs to another user");
    }

    // SECURITY: Validate CSRF state if present (backwards compatible)
    if (existingConnection.oauthState) {
      if (!state) {
        throw new Error("Missing state parameter");
      }
      if (state !== existingConnection.oauthState) {
        throw new Error("Invalid state parameter - possible CSRF attack");
      }
      // Check expiration
      if (
        existingConnection.oauthStateExpiresAt &&
        Date.now() > existingConnection.oauthStateExpiresAt
      ) {
        throw new Error("OAuth state expired - please try again");
      }
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

    // Generate CSRF state for security
    const oauthState = generateOAuthState();

    // Include state in callback URL so it's returned after OAuth
    const callbackWithState = `${redirectUrl}${redirectUrl.includes("?") ? "&" : "?"}state=${oauthState}`;

    // Initiate new connection request (will replace the old one)
    // allowMultiple: true allows re-connecting expired connections
    const connectionRequest = await composio.connectedAccounts.initiate(
      composioUserId,
      authConfigId,
      {
        callbackUrl: callbackWithState,
        allowMultiple: true,
      },
    );

    // Update existing connection record with new state
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
        oauthState,
      },
    );

    return {
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
      // Return state so frontend can pass it back for validation
      state: oauthState,
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
