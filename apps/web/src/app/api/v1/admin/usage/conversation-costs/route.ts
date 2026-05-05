import { type NextRequest, NextResponse } from "next/server";
import { adminUsageDAL } from "@/lib/api/dal/adminUsageAggregate";
import { withAdminAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

async function getHandler(req: NextRequest) {
  const url = new URL(req.url);
  const result = await adminUsageDAL.conversationCosts({
    limit: url.searchParams.get("limit") ?? undefined,
  });
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withAdminAuth(getHandler));
export const dynamic = "force-dynamic";
