import { task } from "@trigger.dev/sdk";

export const checkHealthTask = task({
  id: "check-health",
  maxDuration: 120,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (_payload: Record<string, never>) => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");

    const secret = process.env.TRIGGER_CONVEX_SECRET;
    if (!secret) throw new Error("TRIGGER_CONVEX_SECRET is not set");

    const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

    const response = await fetch(`${siteUrl}/trigger/check-health`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Convex check-health failed (${response.status}): ${body}`,
      );
    }

    return (await response.json()) as { success: boolean };
  },
});
