import { type NextRequest, NextResponse } from "next/server";
import { knowledgeDAL } from "@/lib/api/dal/knowledge";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const { searchParams } = new URL(req.url);
  logger.info({ userId }, "GET /api/v1/knowledge/sources");
  const result = await knowledgeDAL.list(userId, {
    projectId: searchParams.get("projectId"),
  });
  return NextResponse.json(result);
}

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const limited = await enforceRateLimit(
    { prefix: "knowledge-sources", limit: 30, window: "1 h" },
    userId,
  );
  if (limited) return limited;

  const body = await req.json();
  logger.info({ userId }, "POST /api/v1/knowledge/sources");
  const result = await knowledgeDAL.create(userId, body);
  return NextResponse.json(result, { status: 201 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
