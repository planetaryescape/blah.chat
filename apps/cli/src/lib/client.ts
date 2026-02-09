/**
 * API client wrapper for CLI.
 *
 * Default transport is HTTP/SSE via /api/v1 using scoped API keys.
 */

import {
  type BlahClient,
  BlahSDKError,
  createBlahClient,
} from "@blah-chat/api-client";
import { clearCredentials, getCredentials } from "./auth.js";
import { getConfig } from "./config.js";

let clientInstance: BlahClient | null = null;
let currentCacheKey: string | null = null;

function getServerBaseUrl(): string {
  return getConfig().appUrl;
}

export function getApiKey(): string | null {
  const credentials = getCredentials();
  return credentials?.apiKey ?? null;
}

export function getClient(): BlahClient | null {
  const credentials = getCredentials();
  if (!credentials) {
    return null;
  }

  const cacheKey = `${getServerBaseUrl()}::${credentials.apiKey}`;
  if (!clientInstance || currentCacheKey !== cacheKey) {
    clientInstance = createBlahClient({
      baseUrl: getServerBaseUrl(),
      apiKey: credentials.apiKey,
    });
    currentCacheKey = cacheKey;
  }

  return clientInstance;
}

export function requireClient(): BlahClient {
  const client = getClient();
  if (!client) {
    throw new Error("Not logged in. Run: blah login");
  }
  return client;
}

export function requireApiKey(): string {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Not logged in. Run: blah login");
  }
  return apiKey;
}

export async function validateApiKey(): Promise<{
  userId: string;
  email: string;
  name: string;
} | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const result = await client.cliRpc("validateApiKey", undefined);
    return result;
  } catch (error) {
    if (error instanceof BlahSDKError && error.status === 401) {
      clearCredentials();
      return null;
    }
    throw error;
  }
}

export function clearClient(): void {
  clientInstance = null;
  currentCacheKey = null;
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof BlahSDKError) {
    return error.status === 401 || error.code === "MISSING_API_KEY";
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("invalid") ||
      msg.includes("revoked") ||
      msg.includes("api key") ||
      msg.includes("unauthorized") ||
      msg.includes("not logged in")
    );
  }

  return false;
}

export function formatError(error: unknown): string {
  if (isAuthError(error)) {
    return "API key invalid or revoked. Run: blah login";
  }

  if (error instanceof BlahSDKError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxAttempts) {
        break;
      }

      await sleep(delay);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }

  throw lastError;
}
