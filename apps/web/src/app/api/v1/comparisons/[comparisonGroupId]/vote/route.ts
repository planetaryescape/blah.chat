import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { comparisonsDAL } from "@/lib/api/dal/comparisons";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { parseBody } from "@/lib/api/utils";

const voteSchema = z.union([
  z.object({
    winnerMessageId: z.string().min(1),
    outcome: z.literal("winner"),
  }),
  z.object({
    winnerMessageId: z.string().optional().nullable(),
    outcome: z.enum(["tie", "both_bad"]),
  }),
  z.object({
    winnerMessageId: z.string().optional().nullable(),
    rating: z.enum(["left_better", "right_better", "tie", "both_bad"]),
  }),
]);

function normalizeVoteBody(
  body:
    | {
        winnerMessageId: string;
        outcome: "winner";
      }
    | {
        winnerMessageId?: string | null;
        outcome: "tie" | "both_bad";
      }
    | {
        winnerMessageId?: string | null;
        rating: "left_better" | "right_better" | "tie" | "both_bad";
      },
) {
  if ("outcome" in body) {
    return body;
  }

  if (body.rating === "tie" || body.rating === "both_bad") {
    return {
      outcome: body.rating,
      winnerMessageId: body.winnerMessageId ?? null,
    } as const;
  }

  return {
    outcome: "winner" as const,
    winnerMessageId: body.winnerMessageId ?? null,
  };
}

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { comparisonGroupId } = (await params) as { comparisonGroupId: string };
  const body = await parseBody(req, voteSchema);
  const normalized = normalizeVoteBody(body);
  const result = await comparisonsDAL.recordVote(userId, {
    comparisonGroupId,
    winnerMessageId: normalized.winnerMessageId,
    outcome: normalized.outcome,
  });

  return NextResponse.json(result);
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
