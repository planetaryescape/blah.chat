import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import {
  conversations,
  createTriggerClient,
  memoryEmbeddings,
  mergeByRrf,
  messages,
  parsePersistenceEnv,
  serializeVector,
} from "@blah-chat/persistence-postgres";
import { embed } from "ai";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

type MemoryRow = typeof memoryEmbeddings.$inferSelect;

export type MemorySortBy = "date" | "importance" | "confidence";

function getMemoryMetadata(memory: MemoryRow) {
  const metadata =
    memory.metadata && typeof memory.metadata === "object"
      ? { ...memory.metadata }
      : {};

  if (!("category" in metadata) && memory.category) {
    metadata.category = memory.category;
  }

  return metadata;
}

function getImportance(memory: MemoryRow) {
  const metadata = getMemoryMetadata(memory);
  const importance = metadata.importance;
  return typeof importance === "number" ? importance : 0;
}

function getConfidence(memory: MemoryRow) {
  const metadata = getMemoryMetadata(memory);
  const confidence = metadata.confidence;
  return typeof confidence === "number" ? confidence : 0;
}

function normalizeMemoryContent(content: string) {
  return content.trim().replace(/\s+/g, " ").toLowerCase();
}

function sortMemories(rows: MemoryRow[], sortBy: MemorySortBy) {
  const sorted = [...rows];

  switch (sortBy) {
    case "importance":
      return sorted.sort(
        (left, right) => getImportance(right) - getImportance(left),
      );
    case "confidence":
      return sorted.sort(
        (left, right) => getConfidence(right) - getConfidence(left),
      );
    default:
      return sorted.sort((left, right) => right.createdAt - left.createdAt);
  }
}

export function toApiMemory(memory: MemoryRow) {
  const metadata = getMemoryMetadata(memory);
  const category =
    typeof metadata.category === "string" ? metadata.category : memory.category;

  return {
    _id: memory.id,
    content: memory.content,
    category: category ?? "context",
    conversationId: memory.conversationId ?? undefined,
    sourceMessageId: memory.sourceMessageId ?? undefined,
    sourceMessageIds: memory.sourceMessageId
      ? [memory.sourceMessageId]
      : undefined,
    metadata,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    _creationTime: memory.createdAt,
  };
}

export async function listMemories(
  clerkUserId: string,
  input: {
    category?: string;
    sortBy?: MemorySortBy;
    searchQuery?: string;
    limit?: number;
  },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const sortBy = input.sortBy ?? "date";
  const limit = input.limit ?? 1000;

  const rows = await db.query.memoryEmbeddings.findMany({
    where: and(
      eq(memoryEmbeddings.userId, user.id),
      input.category
        ? eq(memoryEmbeddings.category, input.category)
        : undefined,
    ),
  });

  if (!input.searchQuery?.trim()) {
    return sortMemories(rows, sortBy).slice(0, limit).map(toApiMemory);
  }

  const searchQuery = input.searchQuery.trim();
  const searchLimit = Math.min(limit * 3, 200);

  const baseConditions = [
    eq(memoryEmbeddings.userId, user.id),
    ...(input.category ? [eq(memoryEmbeddings.category, input.category)] : []),
  ];

  // Full-text search via tsvector
  const textResults = await db
    .select()
    .from(memoryEmbeddings)
    .where(
      and(
        sql`"memory_embeddings"."search_tsv" @@ plainto_tsquery('english', ${searchQuery})`,
        ...baseConditions,
      ),
    )
    .orderBy(
      sql`ts_rank("memory_embeddings"."search_tsv", plainto_tsquery('english', ${searchQuery})) DESC`,
    )
    .limit(searchLimit);

  // Vector similarity search
  let vectorResults: MemoryRow[] = [];
  try {
    const { embedding: queryEmbedding } = await embed({
      model: EMBEDDING_MODEL,
      value: searchQuery,
    });
    const vecLiteral = serializeVector(queryEmbedding);

    vectorResults = await db
      .select()
      .from(memoryEmbeddings)
      .where(and(...baseConditions))
      .orderBy(sql`"memory_embeddings"."embedding" <=> ${vecLiteral}::vector`)
      .limit(searchLimit);
  } catch {
    vectorResults = [];
  }

  const textWithId = textResults.map((r) => ({ ...r, id: r.id }));
  const vectorWithId = vectorResults.map((r) => ({ ...r, id: r.id }));
  const merged = mergeByRrf(textWithId, vectorWithId, limit);

  return sortMemories(merged as MemoryRow[], sortBy)
    .slice(0, limit)
    .map(toApiMemory);
}

export async function createMemory(
  clerkUserId: string,
  input: {
    content: string;
    category?: string;
  },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const timestamp = Date.now();
  const category = input.category ?? "context";
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: input.content,
  });

  const [created] = await db
    .insert(memoryEmbeddings)
    .values({
      userId: user.id,
      content: input.content,
      category,
      embedding,
      searchDocument: input.content,
      metadata: {
        category,
        importance: 8,
        confidence: 1,
        verifiedBy: "manual",
        version: 1,
        extractedAt: timestamp,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create memory");
  }

  return toApiMemory(created);
}

async function getOwnedMemories(clerkUserId: string, ids: string[]) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const rows = ids.length
    ? await db.query.memoryEmbeddings.findMany({
        where: and(
          eq(memoryEmbeddings.userId, user.id),
          inArray(memoryEmbeddings.id, ids),
        ),
      })
    : [];

  return { db, user, rows };
}

export async function deleteMemory(clerkUserId: string, memoryId: string) {
  const { db, rows } = await getOwnedMemories(clerkUserId, [memoryId]);
  const memory = rows[0];

  if (!memory) {
    throw new Error("Memory not found");
  }

  await db.delete(memoryEmbeddings).where(eq(memoryEmbeddings.id, memory.id));

  return { deleted: 1, ids: [memory.id] };
}

export async function deleteSelectedMemories(
  clerkUserId: string,
  memoryIds: string[],
) {
  const ids = Array.from(new Set(memoryIds));
  if (ids.length === 0) {
    return { deleted: 0 };
  }

  const { db, rows } = await getOwnedMemories(clerkUserId, ids);
  if (rows.length === 0) {
    return { deleted: 0 };
  }

  await db.delete(memoryEmbeddings).where(
    inArray(
      memoryEmbeddings.id,
      rows.map((row) => row.id),
    ),
  );

  return { deleted: rows.length };
}

export async function deleteAllMemories(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const rows = await db.query.memoryEmbeddings.findMany({
    where: eq(memoryEmbeddings.userId, user.id),
  });

  if (rows.length === 0) {
    return { deleted: 0 };
  }

  await db.delete(memoryEmbeddings).where(
    inArray(
      memoryEmbeddings.id,
      rows.map((row) => row.id),
    ),
  );

  return { deleted: rows.length };
}

export async function consolidateMemories(
  clerkUserId: string,
  input: {
    ids?: string[];
  } = {},
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const rows = await db.query.memoryEmbeddings.findMany({
    where: and(
      eq(memoryEmbeddings.userId, user.id),
      input.ids?.length ? inArray(memoryEmbeddings.id, input.ids) : undefined,
    ),
  });

  const original = rows.length;
  if (rows.length < 2) {
    return {
      created: 0,
      deleted: 0,
      original,
      consolidated: original,
    };
  }

  const groups = new Map<string, MemoryRow[]>();
  for (const row of rows) {
    const key = normalizeMemoryContent(row.content);
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }

  const idsToDelete: string[] = [];
  let mergedGroups = 0;

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }

    mergedGroups += 1;
    const [keeper, ...duplicates] = sortMemories(group, "importance");
    const bestImportance = Math.max(...group.map(getImportance));
    const bestConfidence = Math.max(...group.map(getConfidence));
    const metadata = {
      ...getMemoryMetadata(keeper),
      importance: bestImportance,
      confidence: bestConfidence,
      category:
        getMemoryMetadata(keeper).category ?? keeper.category ?? "context",
      version:
        Math.max(
          ...group.map((row) => {
            const version = getMemoryMetadata(row).version;
            return typeof version === "number" ? version : 1;
          }),
        ) + 1,
      verifiedBy: "consolidated",
    };

    await db
      .update(memoryEmbeddings)
      .set({
        metadata,
        updatedAt: Date.now(),
      })
      .where(eq(memoryEmbeddings.id, keeper.id));

    idsToDelete.push(...duplicates.map((duplicate) => duplicate.id));
  }

  if (idsToDelete.length > 0) {
    await db
      .delete(memoryEmbeddings)
      .where(inArray(memoryEmbeddings.id, idsToDelete));
  }

  return {
    created: mergedGroups,
    deleted: idsToDelete.length,
    original,
    consolidated: original - idsToDelete.length,
  };
}

export async function scanRecentConversationsForMemories(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const env = parsePersistenceEnv(process.env);
  const trigger = createTriggerClient(env);
  const recentConversations = await db.query.conversations.findMany({
    where: eq(conversations.userId, user.id),
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
    limit: 5,
  });

  let triggered = 0;

  for (const conversation of recentConversations) {
    const recentMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversation.id),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
      limit: 3,
    });

    if (recentMessages.length < 3) {
      continue;
    }

    await trigger.triggerTask("extract-memories", {
      conversationId: conversation.id,
      userId: user.id,
    });
    triggered += 1;
  }

  return { triggered };
}
