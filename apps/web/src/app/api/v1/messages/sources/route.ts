import { type NextRequest, NextResponse } from "next/server";
import { sourcesDAL } from "@/lib/api/dal/sources";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const { searchParams } = new URL(req.url);
  const messageIds = [
    ...searchParams.getAll("messageId"),
    ...(searchParams
      .get("messageIds")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? []),
  ];
  logger.info(
    { userId, messageCount: messageIds.length },
    "GET /api/v1/messages/sources",
  );
  const result = await sourcesDAL.listByMessage(userId, { messageIds });
  return NextResponse.json(result);
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
