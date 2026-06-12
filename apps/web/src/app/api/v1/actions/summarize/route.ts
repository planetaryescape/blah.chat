import { type NextRequest, NextResponse } from "next/server";
import { summarizeDAL } from "@/lib/api/dal/summarize";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const limited = await enforceRateLimit(
    { prefix: "summarize", limit: 30, window: "1 h" },
    userId,
  );
  if (limited) return limited;

  const body = await req.json();
  logger.info(
    { userId, textLength: body?.text?.length ?? 0 },
    "POST /api/v1/actions/summarize",
  );
  const result = await summarizeDAL.summarize(userId, body);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
export const maxDuration = 60;
