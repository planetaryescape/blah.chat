import { type NextRequest, NextResponse } from "next/server";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id: conversationId } = (await params) as { id: string };
  logger.info(
    { userId, conversationId },
    "GET /api/v1/conversations/:id/integration-events",
  );

  const result = await conversationsDAL.listIntegrationEvents(
    userId,
    conversationId,
  );

  return NextResponse.json(result);
}

export const GET = withErrorHandling(withAuth(getHandler));
export const dynamic = "force-dynamic";
