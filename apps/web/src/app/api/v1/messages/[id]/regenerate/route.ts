import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { messagesDAL } from "@/lib/api/dal/messages";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { getEnqueueGenerationProcessing } from "@/lib/generation-v2/runtime";
import logger from "@/lib/logger";

const regenerateSchema = z
  .object({
    modelId: z.string().optional(),
  })
  .optional();

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const startTime = performance.now();
  const { id } = (await params) as { id: string };
  logger.info(
    { userId, messageId: id },
    "POST /api/v1/messages/[id]/regenerate",
  );

  // Shares the send bucket: a regeneration costs the same as a fresh send.
  const limited = await enforceRateLimit(
    { prefix: "messages", limit: 60, window: "1 h" },
    userId,
  );
  if (limited) return limited;

  const rawBody = await req.text();
  const body = regenerateSchema.parse(
    rawBody.length > 0 ? JSON.parse(rawBody) : undefined,
  );
  const result = await messagesDAL.regenerate(userId, id, body?.modelId);

  const requestId =
    typeof result.data === "object" && result.data && "requestId" in result.data
      ? (result.data.requestId as string | undefined)
      : undefined;

  if (requestId) {
    try {
      await getEnqueueGenerationProcessing()(requestId);
    } catch (error) {
      logger.error(
        { error, requestId },
        "failed to enqueue regenerate generation processing",
      );
      throw error;
    }
  }

  const duration = performance.now() - startTime;
  trackAPIPerformance({
    endpoint: "/api/v1/messages/:id/regenerate",
    method: "POST",
    duration,
    status: 202,
    userId,
  });
  logger.info(
    { userId, messageId: id, requestId, duration },
    "Message regenerated",
  );

  return NextResponse.json(result, { status: 202 });
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
