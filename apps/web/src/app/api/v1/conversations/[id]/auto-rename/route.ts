import { type NextRequest, NextResponse } from "next/server";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
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

  const limited = await enforceRateLimit(
    { prefix: "auto-rename", limit: 30, window: "1 h" },
    userId,
  );
  if (limited) return limited;

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
