import type { IdMap } from "../id-map";
import type {
  ConvexCliApiKey,
  ConvexComposioConnection,
  ConvexUserApiKeys,
} from "../types";
import { ts, tsOpt } from "./utils";

// ---------------------------------------------------------------------------
// CLI API Keys
// ---------------------------------------------------------------------------

export interface PgCliApiKeyRow {
  id: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  lastUsedAt: number | null;
  createdAt: number;
  revokedAt: number | null;
}

export function transformCliApiKey(
  doc: ConvexCliApiKey,
  idMap: IdMap,
): PgCliApiKeyRow {
  return {
    id: idMap.get("cliApiKeys", doc._id),
    userId: idMap.get("users", doc.userId),
    keyHash: doc.keyHash,
    keyPrefix: doc.keyPrefix,
    name: doc.name,
    lastUsedAt: tsOpt(doc.lastUsedAt),
    createdAt: ts(doc.createdAt),
    revokedAt: tsOpt(doc.revokedAt),
  };
}

// ---------------------------------------------------------------------------
// User API Keys (BYOK)
// ---------------------------------------------------------------------------

export interface PgUserApiKeysRow {
  id: string;
  userId: string;
  byokEnabled: boolean;
  encryptedVercelGatewayKey: string | null;
  encryptedOpenRouterKey: string | null;
  encryptedGroqKey: string | null;
  encryptedDeepgramKey: string | null;
  encryptionIvs: string | null;
  authTags: string | null;
  lastValidated: unknown;
  createdAt: number;
  updatedAt: number;
}

export function transformUserApiKeys(
  doc: ConvexUserApiKeys,
  idMap: IdMap,
): PgUserApiKeysRow {
  return {
    id: idMap.get("userApiKeys", doc._id),
    userId: idMap.get("users", doc.userId),
    byokEnabled: doc.byokEnabled,
    encryptedVercelGatewayKey: doc.encryptedVercelGatewayKey ?? null,
    encryptedOpenRouterKey: doc.encryptedOpenRouterKey ?? null,
    encryptedGroqKey: doc.encryptedGroqKey ?? null,
    encryptedDeepgramKey: doc.encryptedDeepgramKey ?? null,
    encryptionIvs: doc.encryptionIVs ?? null,
    authTags: doc.authTags ?? null,
    lastValidated: doc.lastValidated ?? null,
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}

// ---------------------------------------------------------------------------
// Composio Connections
// ---------------------------------------------------------------------------

export interface PgComposioConnectionRow {
  id: string;
  userId: string;
  composioConnectionId: string;
  integrationId: string;
  integrationName: string;
  status: string;
  scopes: string[];
  oauthState: string | null;
  oauthStateExpiresAt: number | null;
  connectedAt: number | null;
  lastUsedAt: number | null;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
}

export function transformComposioConnection(
  doc: ConvexComposioConnection,
  idMap: IdMap,
): PgComposioConnectionRow {
  return {
    id: idMap.get("composioConnections", doc._id),
    userId: idMap.get("users", doc.userId),
    composioConnectionId: doc.composioConnectionId,
    integrationId: doc.integrationId,
    integrationName: doc.integrationName,
    status: doc.status,
    scopes: doc.scopes ?? [],
    oauthState: doc.oauthState ?? null,
    oauthStateExpiresAt: tsOpt(doc.oauthStateExpiresAt),
    connectedAt: tsOpt(doc.connectedAt),
    lastUsedAt: tsOpt(doc.lastUsedAt),
    lastError: doc.lastError ?? null,
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}
