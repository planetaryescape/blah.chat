import { ConvexHttpClient } from "convex/browser";
import { getTableLocation } from "../byod/router";

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

// ===== BYOD Client Management =====

/**
 * Cache for user BYOD clients (cleared on disconnect)
 * Key format: `${userId}:${deploymentUrl}`
 */
const userClientCache = new Map<string, ConvexHttpClient>();

/**
 * Get the main Convex client (singleton) - alias for getConvexClient
 */
export function getMainClient(): ConvexHttpClient {
	return getConvexClient();
}

/**
 * Create a client for user's BYOD instance with admin auth
 * Uses Convex HTTP API with deploy key for authentication
 */
export function createBYODClient(
	deploymentUrl: string,
	_deployKey?: string,
): ConvexHttpClient {
	// Note: ConvexHttpClient doesn't support admin auth directly
	// For BYOD, we use HTTP API calls with Authorization header
	// This client is for unauthenticated queries only
	return new ConvexHttpClient(deploymentUrl);
}

/**
 * Get or create a cached client for user's BYOD instance
 */
export function getUserClient(
	userId: string,
	deploymentUrl: string,
): ConvexHttpClient {
	const cacheKey = `${userId}:${deploymentUrl}`;

	if (userClientCache.has(cacheKey)) {
		return userClientCache.get(cacheKey)!;
	}

	const client = new ConvexHttpClient(deploymentUrl);
	userClientCache.set(cacheKey, client);
	return client;
}

/**
 * Clear cached client for user (call on disconnect)
 */
export function clearUserClient(userId: string): void {
	for (const [key] of userClientCache) {
		if (key.startsWith(`${userId}:`)) {
			userClientCache.delete(key);
		}
	}
}

/**
 * Clear all cached BYOD clients
 */
export function clearAllUserClients(): void {
	userClientCache.clear();
}

/**
 * BYOD configuration for routing
 */
export interface BYODConfig {
	deploymentUrl: string;
	deployKey?: string;
	connectionStatus: "pending" | "connected" | "error" | "disconnected";
}

/**
 * Get the appropriate client for a table based on BYOD configuration
 *
 * @param table - The table name to query
 * @param userId - The user's ID
 * @param byodConfig - Optional BYOD configuration (if user has BYOD enabled)
 * @returns Object with client and whether it's the user's DB
 */
export function getClientForTable(
	table: string,
	userId: string,
	byodConfig?: BYODConfig | null,
): { client: ConvexHttpClient; isUserDb: boolean } {
	const location = getTableLocation(table);

	// Main tables always use main client
	if (location === "main") {
		return { client: getMainClient(), isUserDb: false };
	}

	// User table - check if BYOD enabled and connected
	if (!byodConfig || byodConfig.connectionStatus !== "connected") {
		// No BYOD or not connected - use main DB
		return { client: getMainClient(), isUserDb: false };
	}

	// BYOD enabled - use user's client
	const client = getUserClient(userId, byodConfig.deploymentUrl);
	return { client, isUserDb: true };
}
