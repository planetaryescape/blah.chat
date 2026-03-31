import { NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/api/admin-auth";
import { adminUsersDAL } from "@/lib/api/dal/adminUsers";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(
  _req: Request,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const resolvedParams = await params;
  const id = String(resolvedParams.id);
  await requireCurrentAdmin(userId);
  logger.info(
    { userId, targetUserId: id },
    "GET /api/v1/admin/users/[id]/activity-stats",
  );
  return NextResponse.json(await adminUsersDAL.getActivityStats(id));
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
