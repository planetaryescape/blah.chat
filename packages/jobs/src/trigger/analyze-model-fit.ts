import { task } from "@trigger.dev/sdk";
import { callConvexTriggerEndpoint } from "./utils";

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
    return callConvexTriggerEndpoint<{ success: boolean }>(
      "analyze-model-fit",
      payload,
    );
  },
});
