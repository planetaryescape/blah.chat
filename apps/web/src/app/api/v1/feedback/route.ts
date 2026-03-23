import { type NextRequest, NextResponse } from "next/server";
import { feedbackDAL } from "@/lib/api/dal/feedback";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  logger.info({ userId }, "POST /api/v1/feedback");

  const result = await feedbackDAL.create(userId, body);
  return NextResponse.json(result, { status: 201 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
