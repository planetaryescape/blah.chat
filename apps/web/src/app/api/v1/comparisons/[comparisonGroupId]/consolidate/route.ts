import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { comparisonsDAL } from "@/lib/api/dal/comparisons";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { parseBody } from "@/lib/api/utils";
import { getEnqueueGenerationProcessing } from "@/lib/generation-v2/runtime";
import logger from "@/lib/logger";

const consolidateSchema = z.object({
  consolidationModel: z.string().min(1),
  mode: z.enum(["same-chat", "new-chat"]),
});

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { comparisonGroupId } = (await params) as { comparisonGroupId: string };
  const body = await parseBody(req, consolidateSchema);
  const result = await comparisonsDAL.consolidate(userId, {
    comparisonGroupId,
    consolidationModel: body.consolidationModel,
    mode: body.mode,
  });
  const requestId = result.data?.requestId;
  if (!requestId) {
    throw new Error("Consolidation request missing request id");
  }

  try {
    await getEnqueueGenerationProcessing()(requestId);
  } catch (error) {
    logger.error(
      { error, requestId },
      "failed to enqueue consolidation generation processing",
    );
    throw error;
  }

  return NextResponse.json(result, { status: 202 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
