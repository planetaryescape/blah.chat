import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/api/admin-auth";
import { adminUsersDAL } from "@/lib/api/dal/adminUsers";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  await requireCurrentAdmin(userId);
  const { searchParams } = new URL(req.url);
  logger.info({ userId }, "GET /api/v1/admin/usage-summary");
  return NextResponse.json(
    await adminUsersDAL.listUsageSummary({
      startDate: searchParams.get("startDate") ?? "",
      endDate: searchParams.get("endDate") ?? "",
    }),
  );
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
