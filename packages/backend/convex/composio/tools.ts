"use node";

import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

interface ComposioToolsConfig {
  userId: Id<"users">;
  connections: Doc<"composioConnections">[];
}

/**
 * Create Vercel AI SDK compatible tools from active Composio connections
 */
export async function createComposioTools(
  ctx: ActionCtx,
  config: ComposioToolsConfig,
): Promise<Record<string, unknown>> {
  const { userId, connections } = config;

  // Filter to active connections only
  const activeConnections = connections.filter((c) => c.status === "active");

  if (activeConnections.length === 0) {
    return {};
  }

  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.warn("COMPOSIO_API_KEY not configured - skipping Composio tools");
    return {};
  }

  try {
    // Initialize Composio with Vercel provider
    const composio = new Composio({
      apiKey,
      provider: new VercelProvider(),
    });

    // Create entity ID matching OAuth flow
    const entityId = `blahchat_${userId}`;

    // Get connected toolkits (apps)
    const connectedToolkits = activeConnections.map((c) => c.integrationId);

    // Get tools from Composio for the connected toolkits
    const tools = await composio.tools.get(entityId, {
      toolkits: connectedToolkits,
    });

    // If no tools returned, return empty
    if (!tools || Object.keys(tools).length === 0) {
      return {};
    }

    // Wrap tools to track usage and handle errors
    const wrappedTools: Record<string, unknown> = {};

    for (const [name, originalTool] of Object.entries(tools)) {
      const tool = originalTool as {
        execute?: (...args: unknown[]) => Promise<unknown>;
      };

      if (!tool.execute) {
        // If no execute function, pass through as-is
        wrappedTools[name] = originalTool;
        continue;
      }

      wrappedTools[name] = {
        ...tool,
        execute: async (...args: unknown[]) => {
          try {
            // Find which connection this tool belongs to
            const appName = name.split("_")[0]; // e.g., "GITHUB_CREATE_ISSUE" -> "GITHUB"
            const connection = activeConnections.find(
              (c) => c.integrationId.toUpperCase() === appName.toUpperCase(),
            );

            if (connection) {
              // Update last used timestamp
              await (
                ctx.runMutation as (
                  ref: unknown,
                  args: unknown,
                ) => Promise<void>
              )(
                // @ts-ignore - TypeScript recursion limit
                internal.composio.connections.markConnectionUsed,
                { connectionId: connection._id },
              );
            }

            // Execute the original tool
            return await tool.execute!(...args);
          } catch (error) {
            // Handle expired tokens
            if (
              error instanceof Error &&
              (error.message.includes("expired") ||
                error.message.includes("401") ||
                error.message.includes("unauthorized"))
            ) {
              // Mark connection as expired
              const appName = name.split("_")[0];
              const connection = activeConnections.find(
                (c) => c.integrationId.toUpperCase() === appName.toUpperCase(),
              );

              if (connection) {
                await (
                  ctx.runMutation as (
                    ref: unknown,
                    args: unknown,
                  ) => Promise<void>
                )(
                  // @ts-ignore - TypeScript recursion limit
                  internal.composio.connections.updateConnectionStatus,
                  {
                    composioConnectionId: connection.composioConnectionId,
                    status: "expired",
                    error: "Token expired - please reconnect",
                  },
                );
              }

              throw new Error(
                `${appName} connection expired. Please reconnect in Settings > Integrations.`,
              );
            }

            throw error;
          }
        },
      };
    }

    return wrappedTools;
  } catch (error) {
    console.error("Failed to create Composio tools:", error);
    return {};
  }
}
