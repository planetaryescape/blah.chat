import { type NextRequest, NextResponse } from "next/server";
import { projectsDAL } from "@/lib/api/dal/projects";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const templates = req.nextUrl.searchParams.get("templates") === "true";
  logger.info({ userId, templates }, "GET /api/v1/projects");
  const result = templates
    ? await projectsDAL.listTemplates(userId)
    : await projectsDAL.list(userId);
  return NextResponse.json(result, { status: 200 });
}

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  logger.info({ userId }, "POST /api/v1/projects");
  const result = await projectsDAL.create(userId, body);
  return NextResponse.json(result, { status: 201 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
