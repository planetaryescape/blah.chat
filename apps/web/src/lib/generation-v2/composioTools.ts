import {
  composioConnections,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { eq } from "drizzle-orm";
import type { GenerationRequestIntegrationSnapshot } from "./types";

function getComposioClient() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new Composio({
    apiKey,
    provider: new VercelProvider(),
  });
}

export async function createComposioTools(input: {
  db: PersistenceDb;
  userId: string;
  integrations: GenerationRequestIntegrationSnapshot[];
}) {
  const composio = getComposioClient();
  if (!composio) {
    return {} as Record<string, unknown>;
  }

  const activeIntegrations = input.integrations.filter(
    (integration) =>
      integration.connectionStatus === "active" &&
      integration.composioConnectionId,
  );
  if (activeIntegrations.length === 0) {
    return {} as Record<string, unknown>;
  }

  const tools = await composio.tools.get(`blahchat_${input.userId}`, {
    toolkits: activeIntegrations.map((integration) =>
      integration.integrationId.toLowerCase(),
    ),
    limit: 100,
  });

  const wrappedTools: Record<string, unknown> = {};

  for (const [name, originalTool] of Object.entries(tools)) {
    const tool = originalTool as {
      execute?: (...args: unknown[]) => Promise<unknown>;
    };

    if (!tool.execute) {
      wrappedTools[name] = originalTool;
      continue;
    }

    wrappedTools[name] = {
      ...tool,
      execute: async (...args: unknown[]) => {
        const integrationPrefix = name.split("_")[0]?.toUpperCase() ?? "";
        const snapshot = activeIntegrations.find(
          (integration) =>
            integration.integrationId.toUpperCase() === integrationPrefix,
        );

        try {
          const result = await tool.execute!(...args);

          if (snapshot?.composioConnectionId) {
            await input.db
              .update(composioConnections)
              .set({
                lastUsedAt: Date.now(),
                updatedAt: Date.now(),
              })
              .where(
                eq(
                  composioConnections.composioConnectionId,
                  snapshot.composioConnectionId,
                ),
              );
          }

          return result;
        } catch (error) {
          if (
            error instanceof Error &&
            snapshot?.composioConnectionId &&
            (error.message.includes("expired") ||
              error.message.includes("401") ||
              error.message.includes("unauthorized"))
          ) {
            await input.db
              .update(composioConnections)
              .set({
                status: "expired",
                lastError: "Token expired - please reconnect",
                updatedAt: Date.now(),
              })
              .where(
                eq(
                  composioConnections.composioConnectionId,
                  snapshot.composioConnectionId,
                ),
              );
          }

          throw error;
        }
      },
    };
  }

  return wrappedTools;
}
