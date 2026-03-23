import { task } from "@trigger.dev/sdk";
import { callLegacyConvexTrigger } from "./utils";

export const generateImageTask = task({
  id: "generate-image",
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: {
    conversationId: string;
    messageId: string;
    prompt: string;
    model?: string;
    referenceImageStorageId?: string;
    thinkingEffort?: string;
  }) => {
    return callLegacyConvexTrigger<{ success: boolean }>(
      "generate-image",
      payload,
    );
  },
});
