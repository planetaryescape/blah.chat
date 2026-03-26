import { randomBytes } from "node:crypto";
import { composioConnections } from "@blah-chat/persistence-postgres";
import { INTEGRATIONS_BY_ID } from "@blah-chat/shared/integrations";
import { Composio } from "@composio/core";
import { and, desc, eq } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

const authConfigCache = new Map<string, string>();

function generateOAuthState() {
  return randomBytes(32).toString("hex");
}

async function getOrCreateAuthConfig(
  composio: Composio,
  integrationId: string,
) {
  const cached = authConfigCache.get(integrationId);
  if (cached) {
    return cached;
  }

  const normalizedToolkit = integrationId.toLowerCase();
  const existing = await composio.authConfigs.list({
    toolkit: normalizedToolkit,
  });
  const existingId = existing?.items?.[0]?.id;
  if (existingId) {
    authConfigCache.set(integrationId, existingId);
    return existingId;
  }

  const created = await composio.authConfigs.create(normalizedToolkit, {
    name: `blahchat_${normalizedToolkit}`,
    type: "use_composio_managed_auth",
  });
  authConfigCache.set(integrationId, created.id);
  return created.id;
}

function getComposioClient() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new BadRequestError("COMPOSIO_API_KEY not configured");
  }

  return new Composio({ apiKey });
}

export async function listComposioConnections(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const items = await db.query.composioConnections.findMany({
    where: eq(composioConnections.userId, user.id),
    orderBy: [desc(composioConnections.createdAt)],
  });

  return items.map((connection) => ({
    _id: connection.id,
    integrationId: connection.integrationId,
    integrationName: connection.integrationName,
    composioConnectionId: connection.composioConnectionId,
    status: connection.status as
      | "pending"
      | "initiated"
      | "active"
      | "expired"
      | "failed",
    scopes: connection.scopes,
    connectedAt: connection.connectedAt ?? undefined,
    lastUsedAt: connection.lastUsedAt ?? undefined,
    lastError: connection.lastError ?? undefined,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  }));
}

export async function initiateComposioConnection(
  clerkUserId: string,
  input: {
    integrationId: string;
    redirectUrl: string;
  },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const integration = INTEGRATIONS_BY_ID.get(input.integrationId);
  if (!integration) {
    throw new NotFoundError("Integration", input.integrationId);
  }

  const composio = getComposioClient();
  const authConfigId = await getOrCreateAuthConfig(
    composio,
    input.integrationId,
  );
  const composioUserId = `blahchat_${user.id}`;
  const state = generateOAuthState();
  const callbackUrl = `${input.redirectUrl}${input.redirectUrl.includes("?") ? "&" : "?"}state=${state}`;
  const request = await composio.connectedAccounts.initiate(
    composioUserId,
    authConfigId,
    {
      callbackUrl,
      allowMultiple: true,
    },
  );

  const existing = await db.query.composioConnections.findFirst({
    where: and(
      eq(composioConnections.userId, user.id),
      eq(composioConnections.integrationId, input.integrationId),
    ),
  });
  const now = Date.now();

  if (existing) {
    await db
      .update(composioConnections)
      .set({
        composioConnectionId: request.id,
        integrationName: integration.name,
        status: "initiated",
        oauthState: state,
        oauthStateExpiresAt: now + 10 * 60 * 1000,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(composioConnections.id, existing.id));
  } else {
    await db.insert(composioConnections).values({
      userId: user.id,
      composioConnectionId: request.id,
      integrationId: integration.id,
      integrationName: integration.name,
      status: "initiated",
      scopes: [],
      oauthState: state,
      oauthStateExpiresAt: now + 10 * 60 * 1000,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    redirectUrl: request.redirectUrl,
    connectionId: request.id,
    state,
  };
}

export async function revokeComposioConnection(
  clerkUserId: string,
  input: { integrationId: string },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const connection = await db.query.composioConnections.findFirst({
    where: and(
      eq(composioConnections.userId, user.id),
      eq(composioConnections.integrationId, input.integrationId),
    ),
  });

  if (!connection) {
    return { success: true };
  }

  try {
    const composio = getComposioClient();
    await composio.connectedAccounts.delete(connection.composioConnectionId);
  } catch {
    // Local cleanup still proceeds if remote revoke fails.
  }

  await db
    .delete(composioConnections)
    .where(eq(composioConnections.id, connection.id));

  return { success: true };
}
