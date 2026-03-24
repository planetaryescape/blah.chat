import { NextResponse } from "next/server";
import { comparisonsDAL } from "@/lib/api/dal/comparisons";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

async function getHandler(
  _req: Request,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { comparisonGroupId } = (await params) as { comparisonGroupId: string };
  const result = await comparisonsDAL.getComparisonGroup(
    userId,
    comparisonGroupId,
  );
  return NextResponse.json(result);
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
