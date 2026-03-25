import { type NextRequest, NextResponse } from "next/server";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(
  req: NextRequest,
  {
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  logger.info({ userId }, "POST /api/v1/conversations/cleanup-empty");

  const body = (await req.json()) as { keepOne?: boolean };
  const keepOne = body.keepOne ?? true;

  const result = await conversationsDAL.cleanupEmpty(userId, keepOne);

  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
