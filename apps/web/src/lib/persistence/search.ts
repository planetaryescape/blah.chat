import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import {
  conversations,
  messageEmbeddings,
  messages,
} from "@blah-chat/persistence-postgres";
import { embed } from "ai";
import { and, eq } from "drizzle-orm";
import { ensureCurrentPersistenceUser } from "./current-user";
import { toApiMessage } from "./mappers";
import { getPersistenceDb } from "./server";

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function scoreTextMatch(queryTokens: string[], text: string) {
  if (queryTokens.length === 0) {
    return 0;
  }

  const haystack = text.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += 1;
    }
  }

  return score / queryTokens.length;
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function mergeByRrf<T extends { id: string }>(
  textResults: Array<T>,
  vectorResults: Array<T>,
  limit: number,
) {
  const k = 60;
  const scores = new Map<string, { item: T; score: number }>();

  textResults.forEach((item, index) => {
    scores.set(item.id, {
      item,
      score: 1 / (k + index + 1),
    });
  });

  vectorResults.forEach((item, index) => {
    const existing = scores.get(item.id);
    const score = 1 / (k + index + 1);
    if (existing) {
      existing.score += score;
      return;
    }
    scores.set(item.id, { item, score });
  });

  return Array.from(scores.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export async function searchMessages(
  clerkUserId: string,
  input: {
    query: string;
    conversationId?: string;
    limit: number;
    dateFrom?: number;
    dateTo?: number;
    messageType?: "user" | "assistant";
  },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const rows = await db
    .select({
      message: messages,
      conversationTitle: conversations.title,
      searchDocument: messageEmbeddings.searchDocument,
      embedding: messageEmbeddings.embedding,
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .leftJoin(messageEmbeddings, eq(messageEmbeddings.messageId, messages.id))
    .where(
      and(
        eq(conversations.userId, user.id),
        input.conversationId
          ? eq(messages.conversationId, input.conversationId)
          : undefined,
        input.messageType ? eq(messages.role, input.messageType) : undefined,
      ),
    );

  const filteredRows = rows.filter((row) => {
    if (
      input.dateFrom !== undefined &&
      row.message.createdAt < input.dateFrom
    ) {
      return false;
    }
    if (input.dateTo !== undefined && row.message.createdAt > input.dateTo) {
      return false;
    }
    return true;
  });

  const queryTokens = tokenize(input.query);
  const textRanked = filteredRows
    .map((row) => ({
      ...row,
      id: row.message.id,
      textScore: scoreTextMatch(
        queryTokens,
        row.searchDocument ?? row.message.content,
      ),
    }))
    .filter((row) => row.textScore > 0)
    .sort((left, right) => right.textScore - left.textScore);

  let vectorRanked: Array<(typeof textRanked)[number]> = [];
  const embeddedCandidates = filteredRows.filter(
    (row): row is typeof row & { embedding: number[] } =>
      Array.isArray(row.embedding) && row.embedding.length > 0,
  );

  if (embeddedCandidates.length > 0) {
    try {
      const { embedding: queryEmbedding } = await embed({
        model: EMBEDDING_MODEL,
        value: input.query,
      });

      vectorRanked = embeddedCandidates
        .map((row) => ({
          ...row,
          id: row.message.id,
          textScore: 0,
          vectorScore: cosineSimilarity(queryEmbedding, row.embedding),
        }))
        .filter((row) => row.vectorScore > 0)
        .sort((left, right) => right.vectorScore - left.vectorScore);
    } catch {
      vectorRanked = [];
    }
  }

  const merged = mergeByRrf(textRanked, vectorRanked, input.limit);
  return merged.map((row) => ({
    ...toApiMessage(row.message),
    conversationTitle: row.conversationTitle,
  }));
}
