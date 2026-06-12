import { type NextRequest, NextResponse } from "next/server";
import { memoriesDAL } from "@/lib/api/dal/memories";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";

async function postHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "POST /api/v1/memories/scan-recent");

  const limited = await enforceRateLimit(
    { prefix: "memories-scan-recent", limit: 30, window: "1 h" },
    userId,
  );
  if (limited) return limited;

  const result = await memoriesDAL.scanRecent(userId);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
