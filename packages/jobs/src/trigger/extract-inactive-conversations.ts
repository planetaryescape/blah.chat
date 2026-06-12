import {
  adminSettings,
  conversations,
  createNeonDatabase,
  memoryEmbeddings,
  messages,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { and, count, eq, gt, lt, notExists, sql } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const INACTIVITY_THRESHOLD_MS = 15 * 60 * 1000;
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 50;

export interface ExtractionTarget {
  conversationId: string;
  userId: string;
}

async function defaultEnqueueExtraction(target: ExtractionTarget) {
  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) throw new Error("TRIGGER_SECRET_KEY is not set");

  const apiUrl = process.env.TRIGGER_API_URL ?? "https://api.trigger.dev";
  await fetch(`${apiUrl}/api/v1/tasks/extract-memories/trigger`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      payload: {
        conversationId: target.conversationId,
        userId: target.userId,
      },
    }),
  });
}

export async function extractInactiveConversations(
  deps: {
    db?: PersistenceDb;
    now?: number;
    enqueueExtraction?: (target: ExtractionTarget) => Promise<void>;
  } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const enqueue = deps.enqueueExtraction ?? defaultEnqueueExtraction;

  const adminRow = await db.query.adminSettings.findFirst({
    where: eq(adminSettings.id, "global"),
  });
  if (adminRow?.value?.memory?.autoExtractionEnabled === false) {
    return { scanned: 0, enqueued: 0, skipped: "auto_extraction_disabled" };
  }

  const inactivityCutoff = now - INACTIVITY_THRESHOLD_MS;
  const staleCutoff = now - STALE_THRESHOLD_MS;

  // Find conversations that are:
  // 1. Updated between (now - 7d) and (now - 15min) — inactive but not stale
  // 2. Have >= 2 messages
  // 3. Have no memory embeddings yet for this conversation
  const candidates = await db
    .select({ id: conversations.id, userId: conversations.userId })
    .from(conversations)
    .where(
      and(
        gt(conversations.updatedAt, staleCutoff),
        lt(conversations.updatedAt, inactivityCutoff),
        eq(conversations.isIncognito, false),
        notExists(
          db
            .select({ one: sql`1` })
            .from(memoryEmbeddings)
            .where(eq(memoryEmbeddings.conversationId, conversations.id)),
        ),
      ),
    )
    .limit(BATCH_SIZE);

  // Filter to those with >= 2 messages
  const qualified: ExtractionTarget[] = [];
  for (const candidate of candidates) {
    const [result] = await db
      .select({ msgCount: count() })
      .from(messages)
      .where(eq(messages.conversationId, candidate.id));

    if (result && result.msgCount >= 2) {
      qualified.push({
        conversationId: candidate.id,
        userId: candidate.userId,
      });
    }
  }

  // Enqueue extraction for each qualified conversation
  for (const target of qualified) {
    await enqueue(target);
  }

  return { scheduled: qualified.length };
}
