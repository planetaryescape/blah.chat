import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { comparisonsDAL } from "@/lib/api/dal/comparisons";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { parseBody } from "@/lib/api/utils";

const voteSchema = z.object({
  winnerMessageId: z.string().optional().nullable(),
  rating: z.enum(["left_better", "right_better", "tie", "both_bad"]),
});

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { comparisonGroupId } = (await params) as { comparisonGroupId: string };
  const body = await parseBody(req, voteSchema);
  const result = await comparisonsDAL.recordVote(userId, {
    comparisonGroupId,
    winnerMessageId: body.winnerMessageId,
    rating: body.rating,
  });

  return NextResponse.json(result);
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
