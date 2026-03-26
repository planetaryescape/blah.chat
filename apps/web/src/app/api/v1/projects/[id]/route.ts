import { type NextRequest, NextResponse } from "next/server";
import { projectsDAL } from "@/lib/api/dal/projects";
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
  logger.info({ userId, projectId: id }, "GET /api/v1/projects/[id]");
  const result = await projectsDAL.get(userId, id);
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
  logger.info({ userId, projectId: id }, "PATCH /api/v1/projects/[id]");
  const result = await projectsDAL.update(userId, id, body);
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
  logger.info({ userId, projectId: id }, "DELETE /api/v1/projects/[id]");
  const result = await projectsDAL.remove(userId, id);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const PATCH = withErrorHandling(withUserAuth(patchHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
