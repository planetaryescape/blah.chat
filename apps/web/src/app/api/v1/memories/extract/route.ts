import {
  conversations,
  createTriggerClient,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireActionJobSecret, signActionJobId } from "@/lib/api/action-jobs";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { applyRateLimit, getLimiter } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";
import {
  createHeartbeat,
  createSSEResponse,
  type SSEStream,
} from "../../../_lib/sse-helpers";

const extractMemoriesSchema = z.object({
  conversationId: z.string(),
});

/**
 * POST /api/v1/memories/extract
 * Tier 2: SSE streaming with real-time progress
 *
 * Extracts memories from conversation with progress updates.
 * Falls back to polling if client doesn't support SSE.
 */
async function handler(
  req: NextRequest,
  { userId }: { userId: string },
): Promise<Response> {
  const startTime = Date.now();
  const body = await req.json();
  const validated = extractMemoriesSchema.parse(body);

  logger.info(
    { userId, conversationId: validated.conversationId },
    "POST /api/v1/memories/extract",
  );

  const limiter = getLimiter({
    prefix: "memories:extract",
    limit: 20,
    window: "1 h",
  });
  if (limiter) {
    const limited = await applyRateLimit(limiter, userId);
    if (limited) return limited;
  }

  const user = await ensureCurrentPersistenceUser(userId);
  const conversation = await getPersistenceDb().query.conversations.findFirst({
    where: and(
      eq(conversations.id, validated.conversationId),
      eq(conversations.userId, user.id),
    ),
  });

  if (!conversation) {
    return new Response(
      JSON.stringify(formatErrorEntity("Conversation not found")),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const env = parsePersistenceEnv(process.env);
  const trigger = createTriggerClient(env);
  requireActionJobSecret();
  const run = await trigger.triggerTask("extract-memories", {
    conversationId: validated.conversationId,
    userId: user.id,
  });
  const runId = run.id;

  if (!runId) {
    throw new Error("Trigger run did not return an id");
  }
  const signedRunId = signActionJobId(runId, userId);

  const acceptsSse = req.headers.get("accept")?.includes("text/event-stream");
  if (!acceptsSse) {
    return new Response(
      JSON.stringify(
        formatEntity(
          {
            jobId: signedRunId,
            status: "pending",
            pollUrl: `/api/v1/actions/jobs/${signedRunId}`,
          },
          "job",
        ),
      ),
      {
        status: 202,
        headers: {
          "Content-Type": "application/json",
          Location: `/api/v1/actions/jobs/${signedRunId}`,
        },
      },
    );
  }

  return createSSEResponse(async (stream: SSEStream) => {
    try {
      // Setup heartbeat to keep connection alive
      const stopHeartbeat = createHeartbeat(stream, 30000); // 30s

      try {
        // Send initial progress
        stream.sendProgress(signedRunId, {
          current: 0,
          message: "Queued memory extraction...",
        });

        // Poll job with exponential backoff for progress updates
        let pollInterval = 1000; // Start at 1s
        const maxInterval = 5000; // Max 5s for Tier 2
        const backoffMultiplier = 1.5;
        let attempts = 0;
        const maxAttempts = 20; // 20 attempts at 5s = 100s max (memory extraction: 5-15s typical)

        while (attempts < maxAttempts) {
          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          attempts++;

          // Fetch job status
          const jobResponse = await fetch(
            `${req.nextUrl.origin}/api/v1/actions/jobs/${signedRunId}`,
            {
              headers: {
                Authorization: req.headers.get("Authorization") || "",
                Cookie: req.headers.get("Cookie") || "",
              },
            },
          );

          if (!jobResponse.ok) {
            throw new Error("Failed to fetch job status");
          }

          const jobEnvelope = await jobResponse.json();
          const job = jobEnvelope.data;

          // Send progress if available
          if (job.progress) {
            stream.sendProgress(signedRunId, {
              current: job.progress.current || 0,
              message: job.progress.message || "Processing...",
              eta: job.progress.eta,
            });
          }

          // Handle completion
          if (job.status === "completed") {
            stream.sendComplete(signedRunId, job.result);
            logger.info(
              {
                userId,
                jobId: runId,
                duration: Date.now() - startTime,
                extracted: job.result?.extracted || 0,
              },
              "Memory extraction complete",
            );
            stopHeartbeat();
            return;
          }

          // Handle failure
          if (job.status === "failed") {
            const errorMessage =
              job.error?.message || "Memory extraction failed";
            stream.sendError(signedRunId, errorMessage);
            logger.error(
              { userId, jobId: runId, error: job.error },
              "Memory extraction failed",
            );
            stopHeartbeat();
            return;
          }

          // Exponential backoff for next poll
          if (job.status === "running") {
            pollInterval = Math.min(
              pollInterval * backoffMultiplier,
              maxInterval,
            );
          }
        }

        // Timeout after max attempts
        stream.sendError(signedRunId, {
          message: "Memory extraction timeout",
          code: "TIMEOUT",
        });
        logger.warn({ userId, jobId: runId }, "Memory extraction timeout");
        stopHeartbeat();
      } catch (error) {
        stopHeartbeat();
        throw error;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error({ userId, error: errorMessage }, "Memory extraction error");
      throw error;
    }
  });
}

export const POST = withErrorHandling(withAuth(handler));
export const dynamic = "force-dynamic";
