import { type NextRequest, NextResponse } from "next/server";
import { starterSuggestionsDAL } from "@/lib/api/dal/starterSuggestions";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json().catch(() => ({}));
  logger.info({ userId }, "POST /api/v1/starter-suggestions/refresh");
  const result = await starterSuggestionsDAL.refresh(userId, body);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
