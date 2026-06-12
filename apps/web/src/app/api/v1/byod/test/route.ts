import { type NextRequest, NextResponse } from "next/server";
import { byodDAL } from "@/lib/api/dal/byod";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";

async function postHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "POST /api/v1/byod/test");
  const limited = await enforceRateLimit(
    { prefix: "byod-test", limit: 10, window: "1 h" },
    userId,
  );
  if (limited) return limited;

  const result = await byodDAL.testConnection(userId);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
