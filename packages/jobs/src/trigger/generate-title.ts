import { task } from "@trigger.dev/sdk";

export const generateTitleTask = task({
  id: "generate-title",
  maxDuration: 60,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
  },
  run: async (payload: { conversationId: string }) => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");

    const secret = process.env.TRIGGER_CONVEX_SECRET;
    if (!secret) throw new Error("TRIGGER_CONVEX_SECRET is not set");

    const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

    const response = await fetch(`${siteUrl}/trigger/generate-title`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ conversationId: payload.conversationId }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Convex generate-title failed (${response.status}): ${body}`,
      );
    }

    return (await response.json()) as { success: boolean };
  },
});
