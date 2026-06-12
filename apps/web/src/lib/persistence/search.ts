import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import {
  conversations,
  mergeByRrf,
  messageEmbeddings,
  messages,
  type PersistenceDb,
  serializeVector,
} from "@blah-chat/persistence-postgres";
import { embed } from "ai";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getAdminSettings } from "./adminSettings";
import { ensureCurrentPersistenceUser } from "./current-user";
import { toApiMessage } from "./mappers";
import { getPersistenceDb } from "./server";

export interface SearchDependencies {
  db?: PersistenceDb;
  embedQuery?: (query: string) => Promise<number[]>;
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
  dependencies: SearchDependencies = {},
) {
  const db = dependencies.db ?? getPersistenceDb();
  const embedQueryFn =
    dependencies.embedQuery ??
    (async (query: string) => {
      const { embedding } = await embed({
        model: EMBEDDING_MODEL,
        value: query,
      });
      return embedding;
    });

  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const searchLimit = Math.min(input.limit * 3, 100);

  // Build shared WHERE conditions
  const conditions = [eq(conversations.userId, user.id)];
  if (input.conversationId) {
    conditions.push(eq(messages.conversationId, input.conversationId));
  }
  if (input.messageType) {
    conditions.push(eq(messages.role, input.messageType));
  }
  if (input.dateFrom !== undefined) {
    conditions.push(gte(messages.createdAt, input.dateFrom));
  }
  if (input.dateTo !== undefined) {
    conditions.push(lte(messages.createdAt, input.dateTo));
  }

  // Full-text search via tsvector
  const textResults = await db
    .select({
      message: messages,
      conversationTitle: conversations.title,
    })
    .from(messageEmbeddings)
    .innerJoin(messages, eq(messages.id, messageEmbeddings.messageId))
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        sql`"message_embeddings"."search_tsv" @@ plainto_tsquery('english', ${input.query})`,
        ...conditions,
      ),
    )
    .orderBy(
      sql`ts_rank("message_embeddings"."search_tsv", plainto_tsquery('english', ${input.query})) DESC`,
    )
    .limit(searchLimit);

  // Vector similarity search (admin-toggleable: hybridEnabled=false -> text-only)
  const adminSettings = await getAdminSettings().catch(() => null);
  const hybridEnabled = adminSettings?.search?.hybridEnabled ?? true;
  let vectorResults: typeof textResults = [];
  try {
    if (!hybridEnabled) {
      throw new Error("hybrid_disabled");
    }
    const queryEmbedding = await embedQueryFn(input.query);
    const vecLiteral = serializeVector(queryEmbedding);

    vectorResults = await db
      .select({
        message: messages,
        conversationTitle: conversations.title,
      })
      .from(messageEmbeddings)
      .innerJoin(messages, eq(messages.id, messageEmbeddings.messageId))
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(and(...conditions))
      .orderBy(sql`"message_embeddings"."embedding" <=> ${vecLiteral}::vector`)
      .limit(searchLimit);
  } catch {
    vectorResults = [];
  }

  // RRF merge
  const textWithId = textResults.map((r) => ({
    ...r,
    id: r.message.id,
  }));
  const vectorWithId = vectorResults.map((r) => ({
    ...r,
    id: r.message.id,
  }));

  const merged = mergeByRrf(textWithId, vectorWithId, input.limit);
  return merged.map((row) => ({
    ...toApiMessage(row.message),
    conversationTitle: row.conversationTitle,
  }));
}
