import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { fetchMutation } from "convex/nextjs";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createExtractMemoriesJob } from "@/lib/api/dal/jobs";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
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
    "POST /api/v1/memories/extract (SSE)",
  );

  return createSSEResponse(async (stream: SSEStream) => {
    try {
      // Create job record for persistence
      const jobId = await createExtractMemoriesJob(
        fetchMutation,
        userId as Id<"users">,
        {
          conversationId: validated.conversationId,
        },
      );

      // Setup heartbeat to keep connection alive
      const stopHeartbeat = createHeartbeat(stream, 30000); // 30s

      try {
        // Send initial progress
        stream.sendProgress(jobId, {
          current: 0,
          message: "Loading conversation messages...",
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
            `${req.nextUrl.origin}/api/v1/actions/jobs/${jobId}`,
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
            stream.sendProgress(jobId, {
              current: job.progress.current || 0,
              message: job.progress.message || "Processing...",
              eta: job.progress.eta,
            });
          }

          // Handle completion
          if (job.status === "completed") {
            stream.sendComplete(jobId, job.result);
            logger.info(
              {
                userId,
                jobId,
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
            stream.sendError(jobId, errorMessage);
            logger.error(
              { userId, jobId, error: job.error },
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
        stream.sendError(jobId, {
          message: "Memory extraction timeout",
          code: "TIMEOUT",
        });
        logger.warn({ userId, jobId }, "Memory extraction timeout");
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
