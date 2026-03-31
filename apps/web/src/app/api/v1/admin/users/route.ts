import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/api/admin-auth";
import { adminUsersDAL } from "@/lib/api/dal/adminUsers";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(_req: NextRequest, { userId }: { userId: string }) {
  await requireCurrentAdmin(userId);
  logger.info({ userId }, "GET /api/v1/admin/users");
  return NextResponse.json(await adminUsersDAL.listUsers());
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
