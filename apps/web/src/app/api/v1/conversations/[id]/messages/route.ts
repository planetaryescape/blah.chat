import { after, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { messagesDAL } from "@/lib/api/dal/messages";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import { applyRateLimit, getLimiter } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/utils";
import { generateConversationAck } from "@/lib/conversations/ackGeneration";
import {
  getEnqueueGenerationProcessing,
  getGenerationV2Service,
} from "@/lib/generation-v2/runtime";
import logger from "@/lib/logger";

const sendSchema = z.object({
  content: z.string().min(1),
  modelId: z.string().optional(),
  models: z.array(z.string()).optional(),
  parentMessageId: z.string().optional(),
  clientMessageId: z.string().optional(),
  thinkingEffort: z.enum(["none", "low", "medium", "high"]).optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(["file", "image", "audio"]),
        name: z.string(),
        storageId: z.string(),
        mimeType: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
});

async function getHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id: conversationId } = (await params) as { id: string };
  const startTime = performance.now();
  logger.info(
    { userId, conversationId },
    "GET /api/v1/conversations/:id/messages",
  );

  // Note: messagesDAL.list doesn't support pagination (returns all messages)
  const result = await messagesDAL.list(userId, conversationId);

  const duration = performance.now() - startTime;
  trackAPIPerformance({
    endpoint: "/api/v1/conversations/:id/messages",
    method: "GET",
    duration,
    status: 200,
    userId,
  });
  logger.info({ userId, conversationId, duration }, "Messages listed");

  // Live data: any HTTP caching lets a stale snapshot overwrite in-flight
  // streaming state on the client (messages visibly disappear mid-generation).
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const limiter = getLimiter({
    prefix: "messages",
    limit: 60,
    window: "1 h",
  });
  if (limiter) {
    const limited = await applyRateLimit(limiter, userId);
    if (limited) return limited;
  }

  const { id: conversationId } = (await params) as { id: string };
  const startTime = Date.now();
  logger.info(
    { userId, conversationId },
    "POST /api/v1/conversations/:id/messages",
  );

  const body = await parseBody(req, sendSchema);
  const result = await messagesDAL.send(userId, conversationId, body);

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
        "failed to enqueue message generation processing",
      );
      throw error;
    }

    // Fast ack from a small model while the heavy generation spins up.
    // after() keeps the work alive past the 202 response on serverless.
    const assistantMessageId = result.data.assistantMessageId;
    if (typeof assistantMessageId === "string") {
      after(async () => {
        try {
          const ack = await generateConversationAck(body.content);
          if (!ack) return;
          await getGenerationV2Service().dispatchAck({
            requestId,
            assistantMessageId,
            modelId: ack.modelId,
            text: ack.text,
          });
        } catch (error) {
          logger.warn({ error, requestId }, "ack generation failed");
        }
      });
    }
  }

  const duration = Date.now() - startTime;
  logger.info(
    {
      userId,
      conversationId,
      assistantMessageId: result.data.assistantMessageId,
      duration,
    },
    "Message sent (async generation started)",
  );

  // 202 Accepted - generation happens async
  return NextResponse.json(result, { status: 202 });
}

export const GET = withErrorHandling(withAuth(getHandler));
export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
