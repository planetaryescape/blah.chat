import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/api/admin-auth";
import { adminUsersDAL } from "@/lib/api/dal/adminUsers";
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
  const resolvedParams = await params;
  const id = String(resolvedParams.id);
  await requireCurrentAdmin(userId);
  logger.info(
    { userId, targetUserId: id },
    "PATCH /api/v1/admin/users/[id]/tier",
  );
  return NextResponse.json(
    await adminUsersDAL.updateTier(id, await req.json()),
  );
}

export const PATCH = withErrorHandling(withUserAuth(patchHandler));
export const dynamic = "force-dynamic";
