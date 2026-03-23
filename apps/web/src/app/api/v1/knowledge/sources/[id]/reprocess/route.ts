import { type NextRequest, NextResponse } from "next/server";
import { knowledgeDAL } from "@/lib/api/dal/knowledge";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(
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
    "POST /api/v1/knowledge/sources/[id]/reprocess",
  );
  const result = await knowledgeDAL.reprocess(userId, id);
  return NextResponse.json(result);
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
