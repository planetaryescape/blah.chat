/**
 * Convex HTTP Client wrapper for CLI
 *
 * Uses ConvexHttpClient (not React hooks) for direct queries/mutations.
 * Authenticates using API key stored from CLI login.
 * Note: CLI uses public queries in cliAuth.ts that accept API key as parameter.
 */

import { api } from "@blah-chat/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { clearCredentials, getCredentials } from "./auth.js";
import { getConfig } from "./config.js";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Convex URL - resolved via config (env > user config > bundled default)
function getConvexUrl(): string {
  return getConfig().convexUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Creation
// ─────────────────────────────────────────────────────────────────────────────

let clientInstance: ConvexHttpClient | null = null;

/**
 * Get the API key from stored credentials.
 * Returns null if not logged in.
 */
export function getApiKey(): string | null {
  const credentials = getCredentials();
  return credentials?.apiKey ?? null;
}

/**
 * Get a Convex client (no auth - CLI endpoints accept API key as param).
 * Returns null if not logged in.
 */
export function getClient(): ConvexHttpClient | null {
  const credentials = getCredentials();
  if (!credentials) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = new ConvexHttpClient(getConvexUrl());
  }

  return clientInstance;
}

/**
 * Get a Convex client or throw if not logged in.
 */
export function requireClient(): ConvexHttpClient {
  const client = getClient();
  if (!client) {
    throw new Error("Not logged in. Run: blah login");
  }
  return client;
}

/**
 * Require API key or throw.
 */
export function requireApiKey(): string {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Not logged in. Run: blah login");
  }
  return apiKey;
}

/**
 * Validate the stored API key is still valid (not revoked).
 * Returns user info if valid, null if invalid.
 */
export async function validateApiKey(): Promise<{
  userId: string;
  email: string;
  name: string;
} | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const client = getClient();
  if (!client) return null;

  const result = await client.query(api.cliAuth.validate, { key: apiKey });

  if (!result) {
    // Key is revoked or invalid - clear local credentials
    clearCredentials();
    return null;
  }

  return {
    userId: result.userId as string,
    email: result.email ?? "",
    name: result.name ?? "",
  };
}

/**
 * Clear the client instance (e.g., on logout).
 */
export function clearClient(): void {
  clientInstance = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if an error is an authentication error (API key revoked/invalid).
 */
export function isAuthError(error: unknown): boolean {
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

/**
 * Format error message, with special handling for auth errors.
 */
export function formatError(error: unknown): string {
  if (isAuthError(error)) {
    return "API key invalid or revoked. Run: blah login";
  }
  if (error instanceof Error) {
    // Clean up Convex error messages
    const msg = error.message;
    // Extract just the message part if it's a JSON error
    try {
      const parsed = JSON.parse(msg);
      if (parsed.message) return parsed.message;
    } catch {
      // Not JSON, use as-is
    }
    return msg;
  }
  return String(error);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sleep for a specified duration.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff.
 */
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
