import { type NextRequest, NextResponse } from "next/server";
import { knowledgeDAL } from "@/lib/api/dal/knowledge";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const resolvedParams = await params;
  const id = String(resolvedParams.id);
  logger.info({ userId, sourceId: id }, "GET /api/v1/knowledge/sources/[id]");
  const result = await knowledgeDAL.getById(userId, id);
  return NextResponse.json(result);
}

async function deleteHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const resolvedParams = await params;
  const id = String(resolvedParams.id);
  logger.info(
    { userId, sourceId: id },
    "DELETE /api/v1/knowledge/sources/[id]",
  );
  const result = await knowledgeDAL.delete(userId, id);
  return NextResponse.json(result);
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
