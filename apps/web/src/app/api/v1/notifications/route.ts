import { type NextRequest, NextResponse } from "next/server";
import { notificationsDAL } from "@/lib/api/dal/notifications";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const params = new URL(req.url).searchParams;
  const query = {
    limit: params.get("limit") ?? undefined,
    unreadOnly: params.get("unreadOnly") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
  };
  logger.info({ userId, query }, "GET /api/v1/notifications");
  const result = await notificationsDAL.list(userId, query);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
