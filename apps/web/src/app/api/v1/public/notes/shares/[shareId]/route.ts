import { NextResponse } from "next/server";
import { notesDAL } from "@/lib/api/dal/notes";
import { withOptionalAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import { formatErrorEntity } from "@/lib/utils/formatEntity";

async function getHandler(
  _req: Request,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId?: string;
  },
) {
  const { shareId } = (await params) as { shareId: string };
  logger.info({ shareId }, "GET /api/v1/public/notes/shares/[shareId]");

  const result = await notesDAL.getPublicShareMetadata(shareId, userId);
  if (!result) {
    return NextResponse.json(formatErrorEntity("Note share not found"), {
      status: 404,
    });
  }

  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withOptionalAuth(getHandler));
export const dynamic = "force-dynamic";
