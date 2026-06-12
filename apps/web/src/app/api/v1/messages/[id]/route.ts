import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CachePresets, getCacheControl } from "@/lib/api/cache";
import { messagesDAL } from "@/lib/api/dal/messages";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import { getEnqueueGenerationProcessing } from "@/lib/generation-v2/runtime";
import logger from "@/lib/logger";

const updateMessageSchema = z.object({
  content: z.string().min(1).max(64_000),
  modelId: z.string().optional(),
});

async function getHandler(
  _req: NextRequest,
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
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const startTime = Date.now();
  logger.info({ userId, messageId: id }, "DELETE /api/v1/messages/:id");

  const duration = Date.now() - startTime;
  logger.info({ userId, messageId: id, duration }, "Message deleted");

  const result = await messagesDAL.delete(userId, id);
  return NextResponse.json(result, { status: 200 });
}

async function patchHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const startTime = performance.now();
  logger.info({ userId, messageId: id }, "PATCH /api/v1/messages/:id");

  const body = updateMessageSchema.parse(await req.json());
  const result = await messagesDAL.update(userId, id, body.content, {
    modelId: body.modelId,
  });

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
        "failed to enqueue message edit generation processing",
      );
      throw error;
    }
  }

  const duration = performance.now() - startTime;
  const statusCode = requestId ? 202 : 200;
  trackAPIPerformance({
    endpoint: "/api/v1/messages/:id",
    method: "PATCH",
    duration,
    status: statusCode,
    userId,
  });

  return NextResponse.json(result, { status: statusCode });
}

export const GET = withErrorHandling(withAuth(getHandler));
export const PATCH = withErrorHandling(withAuth(patchHandler));
export const DELETE = withErrorHandling(withAuth(deleteHandler));
export const dynamic = "force-dynamic";
