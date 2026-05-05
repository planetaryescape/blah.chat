import { type NextRequest, NextResponse } from "next/server";
import { autoRouterDAL } from "@/lib/api/dal/autoRouter";
import { withAdminAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler() {
  const result = await autoRouterDAL.get();
  return NextResponse.json(result, { status: 200 });
}

async function patchHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  logger.info({ userId }, "PATCH /api/v1/admin/auto-router/config");
  const result = await autoRouterDAL.update(userId, body);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withAdminAuth(getHandler));
export const PATCH = withErrorHandling(withAdminAuth(patchHandler));
export const dynamic = "force-dynamic";
