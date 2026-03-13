import { task } from "@trigger.dev/sdk";
import { callConvexTriggerEndpoint } from "./utils";

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
    return callConvexTriggerEndpoint<{ success: boolean }>(
      "generate-title",
      payload,
    );
  },
});
