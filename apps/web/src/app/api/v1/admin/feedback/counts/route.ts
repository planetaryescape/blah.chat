import { NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/api/admin-auth";
import { feedbackDAL } from "@/lib/api/dal/feedback";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(_req: Request, { userId }: { userId: string }) {
  await requireCurrentAdmin(userId);
  logger.info({ userId }, "GET /api/v1/admin/feedback/counts");
  const result = await feedbackDAL.counts();
  return NextResponse.json(result);
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
