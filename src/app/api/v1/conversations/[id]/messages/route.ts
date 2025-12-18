import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CachePresets, getCacheControl } from "@/lib/api/cache";
import { messagesDAL } from "@/lib/api/dal/messages";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import { parseBody } from "@/lib/api/utils";
import logger from "@/lib/logger";

const sendSchema = z.object({
  content: z.string().min(1),
  modelId: z.string().optional(),
  models: z.array(z.string()).optional(),
  thinkingEffort: z.enum(["none", "low", "medium", "high"]).optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(["file", "image", "audio"]),
        name: z.string(),
        storageId: z.string(),
        mimeType: z.string(),
        size: z.number(),
      })
    )
    .optional(),
});

async function getHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string }
) {
  const { id: conversationId } = (await params) as { id: string };
  const startTime = performance.now();
  logger.info(
    { userId, conversationId },
    "GET /api/v1/conversations/:id/messages"
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

  const cacheControl = getCacheControl(CachePresets.LIST);
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
  }
) {
  const { id: conversationId } = (await params) as { id: string };
  const startTime = Date.now();
  logger.info(
    { userId, conversationId },
    "POST /api/v1/conversations/:id/messages"
  );

  const body = await parseBody(req, sendSchema);
  const result = await messagesDAL.send(
    userId,
    conversationId,
    body,
    sessionToken
  );

  const duration = Date.now() - startTime;
  logger.info(
    {
      userId,
      conversationId,
      assistantMessageId: result.data.assistantMessageId,
      duration,
    },
    "Message sent (async generation started)"
  );

  // 202 Accepted - generation happens async
  return NextResponse.json(result, { status: 202 });
}

export const GET = withErrorHandling(withAuth(getHandler));
export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
