import { type NextRequest, NextResponse } from "next/server";
import { notesDAL } from "@/lib/api/dal/notes";
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
  logger.info({ userId, noteId: id }, "POST /api/v1/notes/[id]/tags");
  const result = await notesDAL.addTag(userId, id, body);
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
  const tag = new URL(req.url).searchParams.get("tag");
  if (!tag) {
    return NextResponse.json(
      { error: "Missing required query parameter: tag" },
      { status: 400 },
    );
  }
  logger.info({ userId, noteId: id, tag }, "DELETE /api/v1/notes/[id]/tags");
  const result = await notesDAL.removeTag(userId, id, { tag });
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
