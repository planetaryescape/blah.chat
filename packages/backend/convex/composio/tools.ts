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

interface ComposioToolsResult {
  tools: Record<string, unknown>;
  connectedApps: string[];
}

/**
 * Create Vercel AI SDK compatible tools from active Composio connections
 */
export async function createComposioTools(
  ctx: ActionCtx,
  config: ComposioToolsConfig,
): Promise<ComposioToolsResult> {
  const { logger } = await import("../lib/logger");

  logger.info("createComposioTools called", {
    tag: "Composio",
    connectionCount: config.connections.length,
  });

  const { userId, connections } = config;

  // Filter to active connections only
  const activeConnections = connections.filter((c) => c.status === "active");

  if (activeConnections.length === 0) {
    logger.warn("No active connections", { tag: "Composio" });
    return { tools: {}, connectedApps: [] };
  }

  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    logger.error("COMPOSIO_API_KEY not configured", { tag: "Composio" });
    return { tools: {}, connectedApps: [] };
  }

  try {
    // Initialize Composio with Vercel provider
    const composio = new Composio({
      apiKey,
      provider: new VercelProvider(),
    });

    // Create entity ID matching OAuth flow
    const entityId = `blahchat_${userId}`;

    // Get connected toolkits (apps) - Composio expects lowercase
    const connectedToolkits = activeConnections.map((c) =>
      c.integrationId.toLowerCase(),
    );
    const connectedAppNames = activeConnections.map((c) => c.integrationName);

    logger.warn("COMPOSIO_DEBUG About to fetch tools", {
      tag: "COMPOSIO_DEBUG",
      entityId,
      toolkits: connectedToolkits,
      apiKeyPresent: !!apiKey,
    });

    logger.info("Fetching Composio tools", {
      tag: "Composio",
      entityId,
      toolkits: connectedToolkits.join(", "),
    });

    // Get tools from Composio for the connected toolkits
    logger.info("Calling composio.tools.get", {
      tag: "Composio",
      entityId,
      toolkits: connectedToolkits,
    });

    let tools: Record<string, unknown>;
    try {
      tools = await composio.tools.get(entityId, {
        toolkits: connectedToolkits,
        limit: 100, // Default is 20, need more to get all toolkit tools
      });
      logger.warn("COMPOSIO_DEBUG tools.get returned", {
        tag: "COMPOSIO_DEBUG",
        toolsType: typeof tools,
        isNull: tools === null,
        isUndefined: tools === undefined,
        keyCount: tools ? Object.keys(tools).length : 0,
        keys: tools ? Object.keys(tools).slice(0, 5) : [],
      });
      logger.info("composio.tools.get returned", {
        tag: "Composio",
        toolsType: typeof tools,
        isNull: tools === null,
        isUndefined: tools === undefined,
        keys: tools ? Object.keys(tools).slice(0, 20) : [],
      });
    } catch (toolsError) {
      logger.error("COMPOSIO_DEBUG tools.get FAILED", {
        tag: "COMPOSIO_DEBUG",
        error: String(toolsError),
      });
      logger.error("composio.tools.get threw error", {
        tag: "Composio",
        error: String(toolsError),
        errorName: toolsError instanceof Error ? toolsError.name : "unknown",
        errorStack:
          toolsError instanceof Error ? toolsError.stack?.slice(0, 500) : "",
      });
      return { tools: {}, connectedApps: connectedAppNames };
    }

    // If no tools returned, return empty
    if (!tools || Object.keys(tools).length === 0) {
      logger.warn("No tools returned from Composio", {
        tag: "Composio",
        toolkits: connectedToolkits.join(", "),
      });
      return { tools: {}, connectedApps: connectedAppNames };
    }

    logger.info("Composio tools loaded successfully", {
      tag: "Composio",
      toolCount: Object.keys(tools).length,
      toolNames: Object.keys(tools).slice(0, 10).join(", "),
    });

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

    return { tools: wrappedTools, connectedApps: connectedAppNames };
  } catch (error) {
    logger.error("Failed to create Composio tools", {
      tag: "Composio",
      error: String(error),
    });
    return { tools: {}, connectedApps: [] };
  }
}
