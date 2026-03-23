import { type NextRequest, NextResponse } from "next/server";
import { tasksDAL } from "@/lib/api/dal/tasks";
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
  const { id, taskId } = (await params) as { id: string; taskId: string };
  const body = await req.json();
  logger.info(
    { userId, projectId: id, taskId },
    "PATCH /api/v1/projects/[id]/tasks/[taskId]",
  );
  const result = await tasksDAL.updateProject(userId, id, taskId, body);
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
  const { id, taskId } = (await params) as { id: string; taskId: string };
  logger.info(
    { userId, projectId: id, taskId },
    "DELETE /api/v1/projects/[id]/tasks/[taskId]",
  );
  const result = await tasksDAL.deleteProject(userId, id, taskId);
  return NextResponse.json(result, { status: 200 });
}

export const PATCH = withErrorHandling(withUserAuth(patchHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
