import { type NextRequest, NextResponse } from "next/server";
import { notesDAL } from "@/lib/api/dal/notes";
import { withOptionalAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId?: string;
  },
) {
  const { shareId } = (await params) as { shareId: string };
  const body = await req.json().catch(() => ({}));
  logger.info({ shareId }, "POST /api/v1/public/notes/shares/[shareId]/verify");
  const result = await notesDAL.verifyPublicShare(shareId, {
    password:
      typeof body?.password === "string" && body.password.trim()
        ? body.password
        : undefined,
    viewerClerkUserId: userId,
  });
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withOptionalAuth(postHandler));
export const dynamic = "force-dynamic";
