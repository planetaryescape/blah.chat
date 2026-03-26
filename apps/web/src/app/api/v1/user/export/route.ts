import { type NextRequest, NextResponse } from "next/server";
import { userDataDAL } from "@/lib/api/dal/userData";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "GET /api/v1/user/export");
  const result = await userDataDAL.export(userId);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
