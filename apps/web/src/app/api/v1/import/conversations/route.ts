import { type NextRequest, NextResponse } from "next/server";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  const count = Array.isArray(body?.conversations)
    ? body.conversations.length
    : 0;
  logger.info({ userId, count }, "POST /api/v1/import/conversations");
  const result = await conversationsDAL.importBatch(userId, body);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
