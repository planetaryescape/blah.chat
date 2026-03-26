import { type NextRequest, NextResponse } from "next/server";
import { bookmarksDAL } from "@/lib/api/dal/bookmarks";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  logger.info({ userId, messageId }, "GET /api/v1/bookmarks/by-message");
  const result = await bookmarksDAL.getByMessage(userId, messageId ?? "");
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
