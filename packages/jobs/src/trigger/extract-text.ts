import { task } from "@trigger.dev/sdk";
import { callConvexTriggerEndpoint } from "./utils";

export const extractTextTask = task({
  id: "extract-text",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: {
    attachmentId: string;
    storageId: string;
    fileName: string;
    mimeType: string;
  }) => {
    return callConvexTriggerEndpoint<{ success: boolean }>(
      "extract-text",
      payload,
    );
  },
});
