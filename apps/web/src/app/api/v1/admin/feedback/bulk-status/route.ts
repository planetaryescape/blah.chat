import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/api/admin-auth";
import { feedbackDAL } from "@/lib/api/dal/feedback";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  await requireCurrentAdmin(userId);
  const body = await req.json();
  logger.info({ userId }, "POST /api/v1/admin/feedback/bulk-status");
  const result = await feedbackDAL.bulkUpdateStatus(body);
  return NextResponse.json(result);
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
