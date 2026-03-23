import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/api/admin-auth";
import { feedbackDAL } from "@/lib/api/dal/feedback";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  await requireCurrentAdmin(userId);
  const { searchParams } = new URL(req.url);
  logger.info({ userId }, "GET /api/v1/admin/feedback");

  const result = await feedbackDAL.list({
    status: searchParams.get("status"),
    feedbackType: searchParams.get("type"),
    priority: searchParams.get("priority"),
    searchQuery: searchParams.get("q"),
    sortBy: searchParams.get("sort") ?? undefined,
    sortOrder: searchParams.get("order") ?? undefined,
  });

  return NextResponse.json(result);
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
