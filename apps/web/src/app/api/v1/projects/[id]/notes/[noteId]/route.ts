import { type NextRequest, NextResponse } from "next/server";
import { notesDAL } from "@/lib/api/dal/notes";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

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
  const { id, noteId } = (await params) as { id: string; noteId: string };
  const body = await req.json();
  logger.info(
    { userId, projectId: id, noteId },
    "PATCH /api/v1/projects/[id]/notes/[noteId]",
  );
  const result = await notesDAL.updateProject(userId, id, noteId, body);
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
  const { id, noteId } = (await params) as { id: string; noteId: string };
  logger.info(
    { userId, projectId: id, noteId },
    "DELETE /api/v1/projects/[id]/notes/[noteId]",
  );
  const result = await notesDAL.deleteProject(userId, id, noteId);
  return NextResponse.json(result, { status: 200 });
}

export const PATCH = withErrorHandling(withUserAuth(patchHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
