import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { logger } from "./logger";

/**
 * Shared helper to enqueue tasks via Trigger.dev REST API.
 * Callsites use ctx.scheduler.runAfter(0, internal.lib.trigger.enqueueTask, { taskId, payload })
 */
export const enqueueTask = internalAction({
  args: {
    taskId: v.string(),
    payload: v.any(),
  },
  handler: async (_ctx, { taskId, payload }) => {
    const apiKey = process.env.TRIGGER_SECRET_KEY;
    if (!apiKey) {
      throw new Error("TRIGGER_SECRET_KEY is not set");
    }

    const response = await fetch(
      `https://api.trigger.dev/api/v1/tasks/${taskId}/trigger`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      logger.error("Trigger.dev enqueue failed", {
        tag: "TriggerEnqueue",
        taskId,
        status: response.status,
        body,
      });
      throw new Error(
        `Trigger.dev enqueue failed for ${taskId}: ${response.status}`,
      );
    }

    const result = await response.json();
    logger.info("Trigger.dev task enqueued", {
      tag: "TriggerEnqueue",
      taskId,
      runId: result.id,
    });
    return result;
  },
});
