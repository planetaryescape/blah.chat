import { type NextRequest, NextResponse } from "next/server";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import { getConversationShareByConversation } from "@/lib/persistence/conversationShares";
import { formatEntity } from "@/lib/utils/formatEntity";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json(
      {
        status: "error",
        error: { message: "conversationId query param required" },
      },
      { status: 400 },
    );
  }

  logger.info({ userId, conversationId }, "GET /api/v1/shares/by-conversation");

  const share = await getConversationShareByConversation(
    userId,
    conversationId,
  );
  if (!share) {
    return NextResponse.json(
      { status: "success", data: null },
      { status: 200 },
    );
  }

  return NextResponse.json(formatEntity(share, "share", share.id), {
    status: 200,
  });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
