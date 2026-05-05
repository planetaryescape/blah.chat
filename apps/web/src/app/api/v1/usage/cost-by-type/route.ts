import { type NextRequest, NextResponse } from "next/server";
import { userAnalyticsDAL } from "@/lib/api/dal/userAnalytics";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const url = new URL(req.url);
  const result = await userAnalyticsDAL.costByType(userId, {
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
  });
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
