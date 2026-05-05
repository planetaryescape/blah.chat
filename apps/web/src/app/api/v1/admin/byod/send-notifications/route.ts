import { type NextRequest, NextResponse } from "next/server";
import { adminByodDAL } from "@/lib/api/dal/adminByod";
import { withAdminAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  logger.info({ userId }, "POST /api/v1/admin/byod/send-notifications");
  const result = await adminByodDAL.sendNotifications(body);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withAdminAuth(postHandler));
export const dynamic = "force-dynamic";
