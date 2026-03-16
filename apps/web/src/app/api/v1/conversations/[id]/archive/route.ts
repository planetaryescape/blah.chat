import { type NextRequest, NextResponse } from "next/server";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import logger from "@/lib/logger";

async function postHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const startTime = performance.now();
  const { id } = (await params) as { id: string };
  logger.info(
    { userId, conversationId: id },
    "POST /api/v1/conversations/[id]/archive",
  );

  const result = await conversationsDAL.archive(userId, id);

  const duration = performance.now() - startTime;
  trackAPIPerformance({
    endpoint: "/api/v1/conversations/:id/archive",
    method: "POST",
    duration,
    status: 200,
    userId,
  });
  logger.info(
    { userId, conversationId: id, duration },
    "Conversation archived",
  );

  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
