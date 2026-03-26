import { type NextRequest, NextResponse } from "next/server";
import { byokDAL } from "@/lib/api/dal/byok";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "POST /api/v1/byok/disable");
  const result = await byokDAL.disable(userId);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
