import { type NextRequest, NextResponse } from "next/server";
import { bookmarksDAL } from "@/lib/api/dal/bookmarks";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  logger.info({ userId }, "POST /api/v1/bookmarks/bulk");

  const result = await bookmarksDAL.bulkCreate(userId, body);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
