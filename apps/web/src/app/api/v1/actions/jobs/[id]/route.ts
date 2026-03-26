import {
  createTriggerClient,
  parsePersistenceEnv,
  type TriggerRetrieveRunResponse,
} from "@blah-chat/persistence-postgres";

import type { NextRequest } from "next/server";
import { getJobById } from "@/lib/api/dal/jobs";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";

function isTriggerRunId(id: string) {
  return id.startsWith("run_");
}

function mapTriggerRunStatus(
  run: TriggerRetrieveRunResponse,
): "completed" | "failed" | "pending" | "running" {
  if (
    run.isFailed ||
    run.isCancelled ||
    run.status === "CANCELED" ||
    run.status === "FAILED" ||
    run.status === "CRASHED" ||
    run.status === "SYSTEM_FAILURE" ||
    run.status === "TIMED_OUT"
  ) {
    return "failed";
  }

  if (run.isCompleted || run.status === "COMPLETED") {
    return run.isSuccess === false ? "failed" : "completed";
  }

  if (
    run.isExecuting ||
    run.isWaiting ||
    run.status === "DEQUEUED" ||
    run.status === "EXECUTING" ||
    run.status === "WAITING"
  ) {
    return "running";
  }

  return "pending";
}

function mapTriggerRunToJob(runId: string, run: TriggerRetrieveRunResponse) {
  const status = mapTriggerRunStatus(run);

  return {
    _id: runId,
    status,
    progress:
      status === "completed"
        ? undefined
        : {
            current: status === "running" ? 50 : 0,
            message:
              status === "running"
                ? "Background task running..."
                : "Background task queued...",
          },
    result: status === "completed" ? run.output : undefined,
    error:
      status === "failed"
        ? {
            message: run.error?.message || "Trigger run failed",
          }
        : undefined,
  };
}

async function handler(
  _req: NextRequest,
  {
    userId,
    params,
  }: { userId: string; params: Promise<Record<string, string | string[]>> },
) {
  const startTime = Date.now();
  const { id } = (await params) as { id: string };

  logger.info({ userId, jobId: id }, "GET /api/v1/actions/jobs/:id");

  if (isTriggerRunId(id)) {
    try {
      const env = parsePersistenceEnv(process.env);
      const trigger = createTriggerClient(env);
      const run = await trigger.retrieveRun(id);
      const job = mapTriggerRunToJob(id, run);

      return new Response(JSON.stringify(formatEntity(job, "job")), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("404")) {
        logger.warn({ userId, jobId: id }, "Trigger run not found");
        return new Response(
          JSON.stringify(formatErrorEntity("Job not found")),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      throw error;
    }
  }

  const job = await getJobById(id);

  if (!job) {
    logger.warn({ userId, jobId: id }, "Job not found");
    return new Response(JSON.stringify(formatErrorEntity("Job not found")), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const duration = Date.now() - startTime;
  logger.info(
    { userId, jobId: id, status: job.status, duration },
    "Job status retrieved",
  );

  return new Response(JSON.stringify(formatEntity(job, "job")), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET = withErrorHandling(withAuth(handler));
export const dynamic = "force-dynamic";
