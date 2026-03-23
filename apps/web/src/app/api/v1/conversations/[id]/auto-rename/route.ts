import { type NextRequest, NextResponse } from "next/server";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withAuth } from "@/lib/api/middleware/auth";
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
  const { id } = (await params) as { id: string };
  const startTime = Date.now();
  logger.info(
    { userId, conversationId: id },
    "POST /api/v1/conversations/:id/auto-rename",
  );

  const result = await conversationsDAL.autoRename(userId, id);

  const duration = Date.now() - startTime;
  logger.info(
    { userId, conversationId: id, duration },
    "Conversation auto-renamed",
  );

  return NextResponse.json(result);
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
