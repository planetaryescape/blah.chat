import { task } from "@trigger.dev/sdk";
import { callConvexTriggerEndpoint } from "./utils";

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
    return callConvexTriggerEndpoint<{ success: boolean }>("check-health", {});
  },
});
