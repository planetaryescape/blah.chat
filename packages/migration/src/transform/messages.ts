import type { IdMap } from "../id-map";
import type { ConvexMessage } from "../types";
import { int, ts } from "./utils";

export interface PgMessageRow {
  id: string;
  conversationId: string;
  userId: string | null;
  role: string;
  content: string;
  clientMessageId: string | null;
  status: string;
  model: string | null;
  comparisonGroupId: string | null;
  consolidatedMessageId: string | null;
  isConsolidation: boolean;
  rootMessageId: string | null;
  siblingIndex: number;
  forkReason: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PgComparisonVoteRow {
  id: string;
  userId: string;
  comparisonGroupId: string;
  winnerMessageId: string | null;
  rating: string;
  votedAt: number;
}

export interface PgMessageEmbeddingRow {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string | null;
  content: string;
  embedding: string; // formatted as pgvector string "[0.1,0.2,...]"
  searchDocument: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface MessageTransformResult {
  message: PgMessageRow;
  vote?: PgComparisonVoteRow;
  embedding?: PgMessageEmbeddingRow;
}

/**
 * Transform a Convex message to PG row(s).
 *
 * Returns the message row plus optional side-effect rows:
 * - `vote` if the message has embedded votes
 * - `embedding` if the message has an embedding array
 *
 * Routing decisions and sources are handled by separate transforms
 * since they come from normalized Convex tables.
 */
export function transformMessage(
  doc: ConvexMessage,
  idMap: IdMap,
): MessageTransformResult {
  const messageId = idMap.get("messages", doc._id);

  const message: PgMessageRow = {
    id: messageId,
    conversationId: idMap.get("conversations", doc.conversationId),
    userId: idMap.getOptional("users", doc.userId) ?? null,
    role: doc.role,
    content: doc.content,
    clientMessageId: doc.clientMessageId ?? null,
    status: doc.status,
    model: doc.model ?? null,
    comparisonGroupId: doc.comparisonGroupId ?? null,
    consolidatedMessageId:
      idMap.getOptional("messages", doc.consolidatedMessageId) ?? null,
    isConsolidation: doc.isConsolidation ?? false,
    rootMessageId: idMap.getOptional("messages", doc.rootMessageId) ?? null,
    siblingIndex: int(doc.siblingIndex ?? 0),
    forkReason: doc.forkReason ?? null,
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };

  const result: MessageTransformResult = { message };

  // Extract embedded votes -> comparison_votes row
  if (doc.votes && doc.comparisonGroupId && doc.userId) {
    result.vote = {
      id: idMap.get("comparisonVotes", `${doc._id}_vote`),
      userId: idMap.get("users", doc.userId),
      comparisonGroupId: doc.comparisonGroupId,
      winnerMessageId: doc.votes.isWinner ? messageId : null,
      rating: doc.votes.rating,
      votedAt: ts(doc.votes.votedAt),
    };
  }

  // Extract embedding -> message_embeddings row
  if (doc.embedding && doc.embedding.length > 0) {
    result.embedding = {
      id: idMap.get("messageEmbeddings", `${doc._id}_emb`),
      messageId,
      conversationId: idMap.get("conversations", doc.conversationId),
      userId: idMap.getOptional("users", doc.userId) ?? null,
      content: doc.content,
      embedding: `[${doc.embedding.join(",")}]`,
      searchDocument: null,
      createdAt: ts(doc.createdAt),
      updatedAt: ts(doc.updatedAt),
    };
  }

  return result;
}
