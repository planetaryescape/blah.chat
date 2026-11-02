"use node";

import { PostHog } from "posthog-node";

// Initialize PostHog client for server-side tracking
let posthogClient: PostHog | null = null;

function getPostHogClient(): PostHog {
  if (!posthogClient) {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST || "https://app.posthog.com";

    if (!apiKey) {
      throw new Error("POSTHOG_API_KEY environment variable is not set");
    }

    posthogClient = new PostHog(apiKey, {
      host,
      flushAt: 1, // Send immediately
      flushInterval: 0, // Don't batch
    });
  }

  return posthogClient;
}

/**
 * Track a server-side analytics event
 * Use this in Convex actions for critical server-side operations
 */
export async function trackServerEvent(
  eventName: string,
  properties: Record<string, unknown>,
  distinctId: string = "anonymous",
): Promise<void> {
  try {
    const client = getPostHogClient();

    await client.capture({
      distinctId,
      event: eventName,
      properties: {
        ...properties,
        $lib: "convex-server",
        $lib_version: "1.0.0",
      },
    });

    // Ensure events are sent before action completes
    await client.shutdown();
  } catch (error) {
    const { logger } = await import("./logger");
    logger.error("Failed to track server event", {
      tag: "Analytics",
      eventName,
      error: String(error),
    });
    // Don't throw - analytics failures shouldn't break operations
  }
}

/**
 * Identify a user with server-side properties
 * Use this for setting server-side user attributes
 */
export async function identifyUser(
  userId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  try {
    const client = getPostHogClient();

    await client.identify({
      distinctId: userId,
      properties,
    });

    await client.shutdown();
  } catch (error) {
    const { logger } = await import("./logger");
    logger.error("Failed to identify user", {
      tag: "Analytics",
      userId,
      error: String(error),
    });
  }
}

/**
 * Set user properties incrementally
 */
export async function setUserProperties(
  userId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  try {
    const client = getPostHogClient();

    await client.capture({
      distinctId: userId,
      event: "$set",
      properties: {
        $set: properties,
      },
    });

    await client.shutdown();
  } catch (error) {
    const { logger } = await import("./logger");
    logger.error("Failed to set user properties", {
      tag: "Analytics",
      userId,
      error: String(error),
    });
  }
}

/**
 * Check if a feature flag is enabled for a user
 * Use this in Convex functions for server-side feature flagging
 */
export async function isFeatureEnabled(
  userId: string,
  flagKey: string,
): Promise<boolean> {
  try {
    const client = getPostHogClient();

    const isEnabled = await client.isFeatureEnabled(flagKey, userId);

    await client.shutdown();

    return isEnabled ?? false;
  } catch (error) {
    const { logger } = await import("./logger");
    logger.error("Failed to check feature flag", {
      tag: "Analytics",
      userId,
      flagKey,
      error: String(error),
    });
    return false;
  }
}

/**
 * Get feature flag payload
 */
export async function getFeatureFlagPayload(
  userId: string,
  flagKey: string,
): Promise<unknown> {
  try {
    const client = getPostHogClient();

    const payload = await client.getFeatureFlagPayload(flagKey, userId);

    await client.shutdown();

    return payload;
  } catch (error) {
    const { logger } = await import("./logger");
    logger.error("Failed to get feature flag payload", {
      tag: "Analytics",
      userId,
      flagKey,
      error: String(error),
    });
    return null;
  }
}
