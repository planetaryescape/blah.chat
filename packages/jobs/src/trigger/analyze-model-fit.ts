import { task } from "@trigger.dev/sdk";

export const analyzeModelFitTask = task({
  id: "analyze-model-fit",
  maxDuration: 30,
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: {
    conversationId: string;
    userMessage: string;
    currentModelId: string;
    wasAutoSelected?: boolean;
  }) => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");

    const secret = process.env.TRIGGER_CONVEX_SECRET;
    if (!secret) throw new Error("TRIGGER_CONVEX_SECRET is not set");

    const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

    const response = await fetch(`${siteUrl}/trigger/analyze-model-fit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Convex analyze-model-fit failed (${response.status}): ${body}`,
      );
    }

    return (await response.json()) as { success: boolean };
  },
});
