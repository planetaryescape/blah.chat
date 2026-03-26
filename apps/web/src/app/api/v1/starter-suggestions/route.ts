import { type NextRequest, NextResponse } from "next/server";
import { starterSuggestionsDAL } from "@/lib/api/dal/starterSuggestions";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "GET /api/v1/starter-suggestions");
  const result = await starterSuggestionsDAL.get(userId);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
