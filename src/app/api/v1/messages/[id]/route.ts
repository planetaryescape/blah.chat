import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { messagesDAL } from "@/lib/api/dal/messages";
import { getCacheControl, CachePresets } from "@/lib/api/cache";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import logger from "@/lib/logger";

async function getHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const startTime = performance.now();
  logger.debug({ userId, messageId: id }, "GET /api/v1/messages/:id");

  const result = await messagesDAL.get(userId, id);

  const duration = performance.now() - startTime;
  trackAPIPerformance({
    endpoint: "/api/v1/messages/:id",
    method: "GET",
    duration,
    status: 200,
    userId,
  });

  const cacheControl = getCacheControl(CachePresets.SHORT);
  return NextResponse.json(result, {
    headers: { "Cache-Control": cacheControl },
  });
}

async function deleteHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const startTime = Date.now();
  logger.info({ userId, messageId: id }, "DELETE /api/v1/messages/:id");

  await messagesDAL.delete(userId, id);

  const duration = Date.now() - startTime;
  logger.info({ userId, messageId: id, duration }, "Message deleted");

  return new NextResponse(null, { status: 204 });
}

export const GET = withErrorHandling(withAuth(getHandler));
export const DELETE = withErrorHandling(withAuth(deleteHandler));
export const dynamic = "force-dynamic";
