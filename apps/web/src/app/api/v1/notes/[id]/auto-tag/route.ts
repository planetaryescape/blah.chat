import { type NextRequest, NextResponse } from "next/server";
import { notesDAL } from "@/lib/api/dal/notes";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";

async function postHandler(
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
  logger.info({ userId, noteId: id }, "POST /api/v1/notes/[id]/auto-tag");
  const limited = await enforceRateLimit(
    { prefix: "note-auto-tag", limit: 30, window: "1 h" },
    userId,
  );
  if (limited) return limited;

  const result = await notesDAL.triggerAutoTag(userId, id);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
