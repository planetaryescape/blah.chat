import { task } from "@trigger.dev/sdk";
import { callConvexTriggerEndpoint } from "./utils";

export const autoTriageFeedbackTask = task({
  id: "auto-triage-feedback",
  maxDuration: 30,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: { feedbackId: string }) => {
    return callConvexTriggerEndpoint<{ success: boolean }>(
      "auto-triage-feedback",
      payload,
    );
  },
});
