import { type NextRequest, NextResponse } from "next/server";
import { sourcesDAL } from "@/lib/api/dal/sources";
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
  const { id } = (await params) as { id: string };
  logger.info(
    { userId, conversationId: id },
    "GET /api/v1/conversations/[id]/sources",
  );
  const result = await sourcesDAL.listByConversation(userId, id);
  return NextResponse.json(result);
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
