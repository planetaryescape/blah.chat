import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { parseBody } from "@/lib/api/utils";
import logger from "@/lib/logger";
import { z } from "zod";

const updateSchema = z
  .object({
    title: z.string().optional(),
    model: z.string().optional(),
  })
  .partial();

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
    "DELETE /api/v1/conversations/:id",
  );

  const result = await conversationsDAL.delete(userId, id);

  const duration = Date.now() - startTime;
  logger.info({ userId, conversationId: id, duration }, "Conversation deleted");

  return NextResponse.json(result);
}

export const PATCH = withErrorHandling(withAuth(patchHandler));
export const DELETE = withErrorHandling(withAuth(deleteHandler));
export const dynamic = "force-dynamic";
