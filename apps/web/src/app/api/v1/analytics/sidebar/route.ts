import { type NextRequest, NextResponse } from "next/server";
import { sidebarAnalyticsDAL } from "@/lib/api/dal/sidebarAnalytics";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(
  req: NextRequest,
  {
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const body = await req.json();
  logger.info({ userId, event: body?.event }, "POST /api/v1/analytics/sidebar");
  const result = await sidebarAnalyticsDAL.track(userId, body);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
