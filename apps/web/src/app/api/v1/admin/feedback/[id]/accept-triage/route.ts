import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/api/admin-auth";
import { feedbackDAL } from "@/lib/api/dal/feedback";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const resolvedParams = await params;
  const id = String(resolvedParams.id);
  await requireCurrentAdmin(userId);
  const body = await req.json();
  logger.info(
    { userId, feedbackId: id },
    "POST /api/v1/admin/feedback/[id]/accept-triage",
  );
  const result = await feedbackDAL.acceptTriage(id, body);
  return NextResponse.json(result);
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
