import "server-only";

import { PostHog } from "posthog-node";
import logger from "@/lib/logger";

let client: PostHog | null = null;

function getClient() {
  const apiKey = process.env.POSTHOG_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  if (!client) {
    client = new PostHog(apiKey, {
      host:
        process.env.POSTHOG_HOST ||
        process.env.NEXT_PUBLIC_POSTHOG_HOST ||
        "https://app.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return client;
}

export async function captureServerAnalyticsEvent(input: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}) {
  const posthog = getClient();
  if (!posthog) {
    return false;
  }

  try {
    await posthog.capture({
      distinctId: input.distinctId,
      event: input.event,
      properties: input.properties,
    });
    await posthog.shutdown();
    client = null;
    return true;
  } catch (error) {
    logger.warn(
      {
        event: input.event,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to capture server analytics event",
    );
    client = null;
    return false;
  }
}
