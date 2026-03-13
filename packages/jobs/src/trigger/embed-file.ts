import { task } from "@trigger.dev/sdk";
import { callConvexTriggerEndpoint } from "./utils";

/**
 * Orchestrates file embedding via Convex HTTP action.
 * Adds retries + observability on top of existing Convex logic.
 */
export const embedFileTask = task({
  id: "embed-file",
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { fileId: string; jobId?: string }) => {
    return callConvexTriggerEndpoint<{
      success: boolean;
      chunkCount: number;
      duration: number;
    }>("embed-file", { fileId: payload.fileId, jobId: payload.jobId });
  },
});
