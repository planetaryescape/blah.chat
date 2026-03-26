import { type NextRequest, NextResponse } from "next/server";
import { notesDAL } from "@/lib/api/dal/notes";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const { id } = (await params) as { id: string };
  logger.info({ userId, noteId: id }, "GET /api/v1/notes/[id]");
  const result = await notesDAL.get(userId, id);
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
  logger.info({ userId, noteId: id }, "PATCH /api/v1/notes/[id]");
  const result = await notesDAL.update(userId, id, body);
  return NextResponse.json(result, { status: 200 });
}

async function deleteHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const { id } = (await params) as { id: string };
  logger.info({ userId, noteId: id }, "DELETE /api/v1/notes/[id]");
  const result = await notesDAL.delete(userId, id);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const PATCH = withErrorHandling(withUserAuth(patchHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
