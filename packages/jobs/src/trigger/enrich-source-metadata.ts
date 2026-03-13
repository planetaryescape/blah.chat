import { task } from "@trigger.dev/sdk";
import { callConvexTriggerEndpoint } from "./utils";

export const enrichSourceMetadataTask = task({
  id: "enrich-source-metadata",
  maxDuration: 60,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 15000,
    factor: 2,
  },
  run: async (payload: { messageId: string; sourceUrls: string[] }) => {
    return callConvexTriggerEndpoint<{ success: boolean }>(
      "enrich-source-metadata",
      payload,
    );
  },
});
