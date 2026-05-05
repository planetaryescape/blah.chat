import { type NextRequest, NextResponse } from "next/server";
import { adminSettingsDAL } from "@/lib/api/dal/adminSettings";
import { withAdminAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler() {
  const result = await adminSettingsDAL.get();
  return NextResponse.json(result, { status: 200 });
}

async function patchHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  logger.info({ userId }, "PATCH /api/v1/admin/settings");
  const result = await adminSettingsDAL.update(userId, body);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withAdminAuth(getHandler));
export const PATCH = withErrorHandling(withAdminAuth(patchHandler));
export const dynamic = "force-dynamic";
