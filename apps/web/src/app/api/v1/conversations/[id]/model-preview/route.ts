import { type NextRequest, NextResponse } from "next/server";
import { modelPreviewDAL } from "@/lib/api/dal/modelPreview";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const { id } = (await params) as { id: string };
  const limited = await enforceRateLimit(
    { prefix: "model-preview", limit: 30, window: "1 h" },
    userId,
  );
  if (limited) return limited;

  const body = await req.json();
  logger.info(
    { userId, conversationId: id },
    "POST /conversations/[id]/model-preview",
  );
  const result = await modelPreviewDAL.generate(userId, id, body);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
