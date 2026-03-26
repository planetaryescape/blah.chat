import { type NextRequest, NextResponse } from "next/server";
import { bookmarksDAL } from "@/lib/api/dal/bookmarks";
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
  const { id } = (await params) as { id: string };
  const body = await req.json();
  logger.info({ userId, bookmarkId: id }, "POST /api/v1/bookmarks/[id]/tags");
  const result = await bookmarksDAL.addTag(userId, id, body);
  return NextResponse.json(result, { status: 200 });
}

async function deleteHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const { id } = (await params) as { id: string };
  const body = await req.json();
  logger.info({ userId, bookmarkId: id }, "DELETE /api/v1/bookmarks/[id]/tags");
  const result = await bookmarksDAL.removeTag(userId, id, body);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
