/**
 * ConvexClient singleton for WebSocket subscriptions
 *
 * Unlike ConvexHttpClient (HTTP-only), ConvexClient supports:
 * - WebSocket connections
 * - Real-time subscriptions via onUpdate()
 * - Automatic reconnection
 *
 * Use this for reactive queries, use ConvexHttpClient for one-off mutations.
 */

import { ConvexClient } from "convex/browser";
import { getConfig } from "./config.js";

let client: ConvexClient | null = null;

/**
 * Get the ConvexClient singleton.
 * Creates a new client on first call, reuses thereafter.
 */
export function getConvexClient(): ConvexClient {
  if (!client) {
    client = new ConvexClient(getConfig().convexUrl);
  }
  return client;
}

/**
 * Close the ConvexClient connection.
 * Call this when exiting the CLI to clean up WebSocket.
 */
export function closeConvexClient(): void {
  if (client) {
    client.close();
    client = null;
  }
}
