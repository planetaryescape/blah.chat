import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { messagesDAL } from "@/lib/api/dal/messages";
import logger from "@/lib/logger";

async function getHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  logger.debug({ userId, messageId: id }, "GET /api/v1/messages/:id");

  const result = await messagesDAL.get(userId, id);

  return NextResponse.json(result);
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

  const result = await messagesDAL.delete(userId, id);

  const duration = Date.now() - startTime;
  logger.info({ userId, messageId: id, duration }, "Message deleted");

  return NextResponse.json(result);
}

export const GET = withErrorHandling(withAuth(getHandler));
export const DELETE = withErrorHandling(withAuth(deleteHandler));
export const dynamic = "force-dynamic";
