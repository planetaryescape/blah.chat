import { ConvexHttpClient } from "convex/browser";

let _convex: ConvexHttpClient | null = null;

/**
 * Get unauthenticated Convex HTTP client (for queries that don't need auth)
 */
export function getConvexClient(): ConvexHttpClient {
  if (!_convex) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
    }
    _convex = new ConvexHttpClient(url);
  }
  return _convex;
}

/**
 * Get authenticated Convex HTTP client with user's JWT token
 * Use this for mutations that require ctx.auth.getUserIdentity()
 */
export function getAuthenticatedConvexClient(token: string): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
  }
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return client;
}
