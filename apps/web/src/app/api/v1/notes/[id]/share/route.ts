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
  logger.info({ userId, noteId: id }, "POST /api/v1/notes/[id]/share");
  const result = await notesDAL.createShare(userId, id, body);
  return NextResponse.json(result, { status: 200 });
}

async function patchHandler(
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
  logger.info({ userId, noteId: id }, "PATCH /api/v1/notes/[id]/share");
  const result = await notesDAL.toggleShare(userId, id, body);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const PATCH = withErrorHandling(withUserAuth(patchHandler));
export const dynamic = "force-dynamic";
