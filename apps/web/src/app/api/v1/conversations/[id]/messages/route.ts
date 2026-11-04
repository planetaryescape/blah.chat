import { type NextRequest, NextResponse } from "next/server";
import { CachePresets, getCacheControl } from "@/lib/api/cache";
import { messagesDAL } from "@/lib/api/dal/messages";
import { sendMessageSchema } from "@/lib/api/dal/sendMessageSchema";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import { parseBody } from "@/lib/api/utils";
import logger from "@/lib/logger";

async function getHandler(
  _req: NextRequest,
  {
    params,
    userId,
    sessionToken,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
    sessionToken: string;
  },
) {
  const { id: conversationId } = (await params) as { id: string };
  const startTime = performance.now();
  logger.info(
    { userId, conversationId },
    "GET /api/v1/conversations/:id/messages",
  );

  // Note: messagesDAL.list doesn't support pagination (returns all messages)
  const result = await messagesDAL.list(userId, conversationId, sessionToken);

  const duration = performance.now() - startTime;
  trackAPIPerformance({
    endpoint: "/api/v1/conversations/:id/messages",
    method: "GET",
    duration,
    status: 200,
    userId,
  });
  logger.info({ userId, conversationId, duration }, "Messages listed");

  const cacheControl = getCacheControl(CachePresets.NO_CACHE);
  return NextResponse.json(result, {
    headers: { "Cache-Control": cacheControl },
  });
}

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
    sessionToken,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
    sessionToken: string;
  },
) {
  const { id: conversationId } = (await params) as { id: string };
  const startTime = Date.now();
  logger.info(
    { userId, conversationId },
    "POST /api/v1/conversations/:id/messages",
  );

  const body = await parseBody(req, sendMessageSchema);
  const result = await messagesDAL.send(
    userId,
    conversationId,
    body,
    sessionToken,
  );

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
