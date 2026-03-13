import { task } from "@trigger.dev/sdk";
import { callConvexTriggerEndpoint } from "./utils";

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
    return callConvexTriggerEndpoint<{ success: boolean }>(
      "process-source",
      payload,
    );
  },
});
