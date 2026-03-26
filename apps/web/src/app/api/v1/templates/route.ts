import { type NextRequest, NextResponse } from "next/server";
import { templatesDAL } from "@/lib/api/dal/templates";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "GET /api/v1/templates");
  const result = await templatesDAL.list(userId);
  return NextResponse.json(result, { status: 200 });
}

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  logger.info({ userId }, "POST /api/v1/templates");
  const result = await templatesDAL.create(userId, body);
  return NextResponse.json(result, { status: 201 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
