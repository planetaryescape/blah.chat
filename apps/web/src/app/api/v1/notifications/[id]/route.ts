import { type NextRequest, NextResponse } from "next/server";
import { notificationsDAL } from "@/lib/api/dal/notifications";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function patchHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const { id } = (await params) as { id: string };
  const body = await req.json();
  logger.info(
    { userId, notificationId: id },
    "PATCH /api/v1/notifications/[id]",
  );
  const result = await notificationsDAL.markRead(userId, id, body);
  return NextResponse.json(result, { status: 200 });
}

async function deleteHandler(
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
    { userId, notificationId: id },
    "DELETE /api/v1/notifications/[id]",
  );
  const result = await notificationsDAL.dismiss(userId, id);
  return NextResponse.json(result, { status: 200 });
}

export const PATCH = withErrorHandling(withUserAuth(patchHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
