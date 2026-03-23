import { type NextRequest, NextResponse } from "next/server";
import { tasksDAL } from "@/lib/api/dal/tasks";
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
  logger.info({ userId, projectId: id }, "GET /api/v1/projects/[id]/tasks");
  const result = await tasksDAL.listProject(userId, id);
  return NextResponse.json(result, { status: 200 });
}

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
  logger.info({ userId, projectId: id }, "POST /api/v1/projects/[id]/tasks");
  const result = await tasksDAL.createProject(userId, id, body);
  return NextResponse.json(result, { status: 201 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
