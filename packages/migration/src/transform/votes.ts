import type { IdMap } from "../id-map";
import type { ConvexVote } from "../types";
import { ts } from "./utils";

export interface PgComparisonVoteRow {
  id: string;
  userId: string;
  comparisonGroupId: string;
  winnerMessageId: string | null;
  rating: string;
  votedAt: number;
}

/**
 * Transform Convex votes table entries to PG comparison_votes.
 * Note: Votes can also be extracted from embedded message.votes (see messages.ts).
 * This handles the standalone votes table.
 */
export function transformVote(
  doc: ConvexVote,
  idMap: IdMap,
): PgComparisonVoteRow {
  return {
    id: idMap.get("votes", doc._id),
    userId: idMap.get("users", doc.userId),
    comparisonGroupId: doc.comparisonGroupId,
    winnerMessageId: idMap.getOptional("messages", doc.winnerId) ?? null,
    rating: doc.rating,
    votedAt: ts(doc.votedAt),
  };
}
