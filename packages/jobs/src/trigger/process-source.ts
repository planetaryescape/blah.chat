import { task } from "@trigger.dev/sdk";

export const processSourceTask = task({
  id: "process-source",
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  run: async (payload: { sourceId: string }) => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");

    const secret = process.env.TRIGGER_CONVEX_SECRET;
    if (!secret) throw new Error("TRIGGER_CONVEX_SECRET is not set");

    const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

    const response = await fetch(`${siteUrl}/trigger/process-source`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ sourceId: payload.sourceId }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Convex process-source failed (${response.status}): ${body}`,
      );
    }

    return (await response.json()) as { success: boolean };
  },
});
