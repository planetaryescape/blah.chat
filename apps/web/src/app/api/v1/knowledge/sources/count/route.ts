import { type NextRequest, NextResponse } from "next/server";
import { knowledgeDAL } from "@/lib/api/dal/knowledge";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const { searchParams } = new URL(req.url);
  logger.info({ userId }, "GET /api/v1/knowledge/sources/count");
  const result = await knowledgeDAL.count(userId, {
    projectId: searchParams.get("projectId"),
  });
  return NextResponse.json(result);
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
