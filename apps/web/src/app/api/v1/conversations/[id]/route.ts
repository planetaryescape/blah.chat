import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CachePresets, getCacheControl } from "@/lib/api/cache";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import { parseBody } from "@/lib/api/utils";
import logger from "@/lib/logger";

const updateSchema = z
  .object({
    title: z.string().optional(),
    model: z.string().optional(),
  })
  .partial();

async function getHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const startTime = performance.now();
  logger.info({ userId, conversationId: id }, "GET /api/v1/conversations/:id");

  const result = await conversationsDAL.getById(userId, id);

  const duration = performance.now() - startTime;
  trackAPIPerformance({
    endpoint: "/api/v1/conversations/:id",
    method: "GET",
    duration,
    status: 200,
    userId,
  });
  logger.info({ userId, conversationId: id, duration }, "Conversation fetched");

  const cacheControl = getCacheControl(CachePresets.ITEM);
  return NextResponse.json(result, {
    headers: { "Cache-Control": cacheControl },
  });
}

async function patchHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const startTime = Date.now();
  logger.info(
    { userId, conversationId: id },
    "PATCH /api/v1/conversations/:id",
  );

  const body = await parseBody(req, updateSchema);
  const result = await conversationsDAL.update(userId, id, body);

  const duration = Date.now() - startTime;
  logger.info({ userId, conversationId: id, duration }, "Conversation updated");

  return NextResponse.json(result);
}

async function deleteHandler(
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
  const { id } = (await params) as { id: string };
  const startTime = Date.now();
  logger.info(
    { userId, conversationId: id },
    "DELETE /api/v1/conversations/:id",
  );

  await conversationsDAL.delete(userId, id, sessionToken);

  const duration = Date.now() - startTime;
  logger.info({ userId, conversationId: id, duration }, "Conversation deleted");

  return new NextResponse(null, { status: 204 });
}

export const GET = withErrorHandling(withAuth(getHandler));
export const PATCH = withErrorHandling(withAuth(patchHandler));
export const DELETE = withErrorHandling(withAuth(deleteHandler));
export const dynamic = "force-dynamic";
