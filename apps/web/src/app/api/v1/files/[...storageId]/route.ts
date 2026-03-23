import { type NextRequest, NextResponse } from "next/server";
import { filesDAL } from "@/lib/api/dal/files";
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
  const resolvedParams = await params;
  const storageId = resolvedParams.storageId;
  const key = Array.isArray(storageId)
    ? storageId.join("/")
    : String(storageId);
  logger.info({ userId, storageId: key }, "GET /api/v1/files/[...storageId]");
  const result = await filesDAL.getFileUrl(userId, key);
  if (!result.data?.url) {
    throw new Error("File URL unavailable");
  }
  const url = result.data.url;
  return NextResponse.redirect(url, { status: 302 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
