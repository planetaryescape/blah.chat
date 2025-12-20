/**
 * BYOD Data Access Layer
 *
 * Provides functions for managing BYOD configuration and operations.
 * This DAL handles:
 * - Getting/updating BYOD config
 * - Testing connections
 * - Deploying schema
 * - Managing client lifecycle
 */

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { getAuthenticatedConvexClient, clearUserClient } from "../convex";

/**
 * BYOD configuration (safe version, no encrypted credentials)
 */
export interface BYODConfigSafe {
	_id: Id<"userDatabaseConfig">;
	connectionStatus: "pending" | "connected" | "error" | "disconnected";
	lastConnectionTest?: number;
	connectionError?: string;
	schemaVersion: number;
	lastSchemaDeploy?: number;
	deploymentStatus?: "not_started" | "deploying" | "deployed" | "failed";
	deploymentProgress?: string;
	createdAt: number;
	updatedAt: number;
}

/**
 * Get the current user's BYOD configuration
 */
export async function getBYODConfig(
	token: string,
): Promise<BYODConfigSafe | null> {
	const client = getAuthenticatedConvexClient(token);
	// @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
	return await client.query(api.byod.credentials.getConfig, {});
}

/**
 * Save BYOD credentials (encrypts on server)
 */
export async function saveBYODCredentials(
	token: string,
	deploymentUrl: string,
	deployKey: string,
): Promise<{ success: boolean }> {
	const client = getAuthenticatedConvexClient(token);
	return await client.action(api.byod.saveCredentials.saveCredentials, {
		deploymentUrl,
		deployKey,
	});
}

/**
 * Test connection to user's BYOD instance
 */
export async function testBYODConnection(
	token: string,
): Promise<{ success: boolean; error?: string }> {
	const client = getAuthenticatedConvexClient(token);
	return await client.action(api.byod.testConnection.testConnection, {});
}

/**
 * Deploy schema to user's BYOD instance
 */
export async function deployBYODSchema(
	token: string,
): Promise<{ success: boolean; message: string }> {
	const client = getAuthenticatedConvexClient(token);
	return await client.action(api.byod.deploy.deployToUserInstance, {});
}

/**
 * Retry a failed deployment
 */
export async function retryBYODDeployment(
	token: string,
): Promise<{ success: boolean; message: string }> {
	const client = getAuthenticatedConvexClient(token);
	return await client.action(api.byod.deploy.retryDeployment, {});
}

/**
 * Get deployment status
 */
export async function getBYODDeploymentStatus(token: string): Promise<{
	status?: "not_started" | "deploying" | "deployed" | "failed";
	progress?: string;
	schemaVersion?: number;
	lastDeploy?: number;
} | null> {
	const client = getAuthenticatedConvexClient(token);
	return await client.action(api.byod.deploy.getDeploymentStatus, {});
}

/**
 * Disconnect BYOD (marks as disconnected, keeps data)
 */
export async function disconnectBYOD(
	token: string,
	userId: string,
): Promise<{ success: boolean }> {
	const client = getAuthenticatedConvexClient(token);
	const result = await client.mutation(api.byod.credentials.disconnect, {});

	// Clear cached client
	if (result.success) {
		clearUserClient(userId);
	}

	return result;
}

/**
 * Check if user has BYOD enabled and connected
 */
export async function isBYODEnabled(token: string): Promise<boolean> {
	const config = await getBYODConfig(token);
	return config?.connectionStatus === "connected";
}

/**
 * Full BYOD setup flow:
 * 1. Save credentials
 * 2. Test connection
 * 3. Deploy schema (if connection successful)
 */
export async function setupBYOD(
	token: string,
	deploymentUrl: string,
	deployKey: string,
): Promise<{
	success: boolean;
	step: "credentials" | "connection" | "deployment";
	error?: string;
}> {
	// Step 1: Save credentials
	try {
		await saveBYODCredentials(token, deploymentUrl, deployKey);
	} catch (error) {
		return {
			success: false,
			step: "credentials",
			error: error instanceof Error ? error.message : "Failed to save credentials",
		};
	}

	// Step 2: Test connection
	try {
		const connectionResult = await testBYODConnection(token);
		if (!connectionResult.success) {
			return {
				success: false,
				step: "connection",
				error: connectionResult.error || "Connection test failed",
			};
		}
	} catch (error) {
		return {
			success: false,
			step: "connection",
			error: error instanceof Error ? error.message : "Connection test failed",
		};
	}

	// Step 3: Deploy schema
	try {
		const deployResult = await deployBYODSchema(token);
		if (!deployResult.success) {
			return {
				success: false,
				step: "deployment",
				error: deployResult.message || "Schema deployment failed",
			};
		}
	} catch (error) {
		return {
			success: false,
			step: "deployment",
			error: error instanceof Error ? error.message : "Schema deployment failed",
		};
	}

	return { success: true, step: "deployment" };
}
