import { type NextRequest, NextResponse } from "next/server";
import { notificationsDAL } from "@/lib/api/dal/notifications";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "POST /api/v1/notifications/mark-all-read");
  const result = await notificationsDAL.markAllRead(userId);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
