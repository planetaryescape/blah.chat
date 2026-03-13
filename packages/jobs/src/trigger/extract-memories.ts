import { task } from "@trigger.dev/sdk";
import { callConvexTriggerEndpoint } from "./utils";

export const extractMemoriesTask = task({
  id: "extract-memories",
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { conversationId: string }) => {
    return callConvexTriggerEndpoint<{ extracted: number }>(
      "extract-memories",
      payload,
    );
  },
});
