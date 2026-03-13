import { task } from "@trigger.dev/sdk";
import { callConvexTriggerEndpoint } from "./utils";

/**
 * Orchestrates audio transcription via Convex HTTP action.
 * Adds retries + observability on top of existing Convex logic.
 */
export const transcribeTask = task({
  id: "transcribe",
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { storageId: string; mimeType?: string }) => {
    return callConvexTriggerEndpoint<{ text: string }>("transcribe", {
      storageId: payload.storageId,
      mimeType: payload.mimeType ?? "audio/webm",
    });
  },
});
