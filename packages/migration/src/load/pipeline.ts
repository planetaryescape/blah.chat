import * as schema from "@blah-chat/persistence-postgres";
import type { PgTable } from "drizzle-orm/pg-core";
import { readTableFromZip } from "../extract/reader";
import { IdMap } from "../id-map";
import {
  transformCliApiKey,
  transformComposioConnection,
  transformUserApiKeys,
} from "../transform/api-keys";
import { transformAttachment } from "../transform/attachments";
import { transformBookmark } from "../transform/bookmarks";
import { transformConsolidation } from "../transform/consolidations";
import { transformConversation } from "../transform/conversations";
import { transformFeedback } from "../transform/feedback";
import {
  transformKnowledgeChunk,
  transformKnowledgeSource,
} from "../transform/knowledge";
import { transformMemory } from "../transform/memories";
import { transformMessageEdges } from "../transform/message-edges";
import { transformMessage } from "../transform/messages";
import { transformNote } from "../transform/notes";
import { transformPreference } from "../transform/preferences";
import { transformProject } from "../transform/projects";
import {
  transformRoutingDecisionFromMessage,
  transformRoutingExample,
} from "../transform/routing";
import { transformShare } from "../transform/shares";
import { transformSource, transformSourceMetadata } from "../transform/sources";
import { transformStarterSuggestions } from "../transform/starter-suggestions";
import { transformTask } from "../transform/tasks";
import { transformTemplate } from "../transform/templates";
import { transformToolCall } from "../transform/tool-calls";
import { transformTtsCache } from "../transform/tts-cache";
import { transformUsageRecord } from "../transform/usage";
import { transformUser } from "../transform/users";
import { transformVote } from "../transform/votes";
import type * as T from "../types";
import { batchInsert } from "./batch-inserter";

export interface PipelineOptions {
  inputZip: string;
  bucket: string;
  dryRun?: boolean;
  skipBlobs?: boolean;
  batchSize?: number;
  onProgress?: (table: string, count: number) => void;
}

export interface PipelineResult {
  idMap: IdMap;
  counts: Record<string, number>;
  errors: string[];
}

/**
 * Full ETL pipeline: Extract from Convex ZIP -> Transform -> Load into Postgres.
 *
 * Processes tables in FK dependency order (tiers).
 * Two-pass: first inserts conversations with null activeLeafMessageId,
 * then updates after messages are loaded.
 */
export async function runPipeline(
  // biome-ignore lint/suspicious/noExplicitAny: drizzle db type is complex
  db: any,
  options: PipelineOptions,
): Promise<PipelineResult> {
  const idMap = new IdMap();
  const counts: Record<string, number> = {};
  const errors: string[] = [];
  const { inputZip, bucket, batchSize } = options;

  async function loadTable<TDoc, TRow>(
    tableName: string,
    pgTable: PgTable,
    transform: (doc: TDoc) => TRow | TRow[] | null,
  ) {
    const docs = await readTableFromZip<TDoc>(inputZip, tableName);
    const rows: TRow[] = [];
    for (const doc of docs) {
      const result = transform(doc);
      if (result === null) continue;
      if (Array.isArray(result)) {
        rows.push(...result);
      } else {
        rows.push(result);
      }
    }

    if (!options.dryRun && rows.length > 0) {
      const result = await batchInsert(db, pgTable, rows, { batchSize });
      counts[tableName] = result.inserted;
    } else {
      counts[tableName] = rows.length;
    }
    options.onProgress?.(tableName, counts[tableName]);
  }

  // Store raw Convex docs for second pass
  let convexConversations: T.ConvexConversation[] = [];
  let convexMessages: T.ConvexMessage[] = [];

  // ── Tier 1: No FK dependencies ──
  await loadTable<T.ConvexUser, unknown>(
    "users",
    schema.users as unknown as PgTable,
    (doc) => transformUser(doc, idMap),
  );

  await loadTable<T.ConvexTemplate, unknown>(
    "templates",
    schema.templates as unknown as PgTable,
    (doc) => transformTemplate(doc, idMap),
  );

  await loadTable<T.ConvexSourceMetadata, unknown>(
    "sourceMetadata",
    schema.sourceMetadata as unknown as PgTable,
    (doc) => transformSourceMetadata(doc, idMap),
  );

  // ── Tier 2: Depends on users ──
  await loadTable<T.ConvexProject, unknown>(
    "projects",
    schema.projects as unknown as PgTable,
    (doc) => transformProject(doc, idMap),
  );

  await loadTable<T.ConvexUserPreference, unknown>(
    "userPreferences",
    schema.userPreferences as unknown as PgTable,
    (doc) => transformPreference(doc, idMap),
  );

  await loadTable<T.ConvexCliApiKey, unknown>(
    "cliApiKeys",
    schema.cliApiKeys as unknown as PgTable,
    (doc) => transformCliApiKey(doc, idMap),
  );

  await loadTable<T.ConvexUserApiKeys, unknown>(
    "userApiKeys",
    schema.userApiKeys as unknown as PgTable,
    (doc) => transformUserApiKeys(doc, idMap),
  );

  await loadTable<T.ConvexComposioConnection, unknown>(
    "composioConnections",
    schema.composioConnections as unknown as PgTable,
    (doc) => transformComposioConnection(doc, idMap),
  );

  await loadTable<T.ConvexChatSuggestionsCache, unknown>(
    "chatSuggestionsCache",
    schema.starterSuggestionCaches as unknown as PgTable,
    (doc) => transformStarterSuggestions(doc, idMap),
  );

  // ── Tier 3: Depends on users + projects ──
  // First pass: insert conversations with null activeLeafMessageId
  convexConversations = await readTableFromZip<T.ConvexConversation>(
    inputZip,
    "conversations",
  );

  // Handle M:N project junction -> FK denormalization (pick most recent)
  const projectConvos = await readTableFromZip<T.ConvexProjectConversation>(
    inputZip,
    "projectConversations",
  );
  const convProjectMap = new Map<
    string,
    { projectId: string; addedAt: number }
  >();
  for (const pc of projectConvos) {
    const existing = convProjectMap.get(pc.conversationId);
    if (!existing || pc.addedAt > existing.addedAt) {
      convProjectMap.set(pc.conversationId, {
        projectId: pc.projectId,
        addedAt: pc.addedAt,
      });
    }
  }

  const convRows = convexConversations.map((doc) => {
    // Apply project from junction table if conversation has no direct projectId
    if (!doc.projectId) {
      const junctionProject = convProjectMap.get(doc._id);
      if (junctionProject) {
        doc = { ...doc, projectId: junctionProject.projectId };
      }
    }
    return transformConversation(doc, idMap);
  });

  if (!options.dryRun && convRows.length > 0) {
    const result = await batchInsert(
      db,
      schema.conversations as unknown as PgTable,
      convRows,
      { batchSize },
    );
    counts.conversations = result.inserted;
  } else {
    counts.conversations = convRows.length;
  }
  options.onProgress?.("conversations", counts.conversations);

  // ── Tier 4: Messages ──
  convexMessages = await readTableFromZip<T.ConvexMessage>(
    inputZip,
    "messages",
  );
  const messageRows: unknown[] = [];
  const voteRows: unknown[] = [];
  const embeddingRows: unknown[] = [];
  const edgeRows: unknown[] = [];
  const routingRows: unknown[] = [];
  const consolidationRows: unknown[] = [];

  for (const doc of convexMessages) {
    const { message, vote, embedding } = transformMessage(doc, idMap);
    messageRows.push(message);
    if (vote) voteRows.push(vote);
    if (embedding) embeddingRows.push(embedding);

    const edges = transformMessageEdges(doc, idMap);
    edgeRows.push(...edges);

    const routing = transformRoutingDecisionFromMessage(doc, idMap);
    if (routing) routingRows.push(routing);

    const consolidation = transformConsolidation(doc, idMap);
    if (consolidation) consolidationRows.push(consolidation);
  }

  if (!options.dryRun) {
    if (messageRows.length > 0) {
      const r = await batchInsert(
        db,
        schema.messages as unknown as PgTable,
        messageRows,
        { batchSize },
      );
      counts.messages = r.inserted;
    }
    if (edgeRows.length > 0) {
      const r = await batchInsert(
        db,
        schema.messageEdges as unknown as PgTable,
        edgeRows,
        { batchSize },
      );
      counts.messageEdges = r.inserted;
    }
  } else {
    counts.messages = messageRows.length;
    counts.messageEdges = edgeRows.length;
  }
  options.onProgress?.("messages", counts.messages ?? 0);

  // ── Tier 5: Depends on messages ──
  await loadTable<T.ConvexAttachment, unknown>(
    "attachments",
    schema.attachments as unknown as PgTable,
    (doc) => transformAttachment(doc, idMap, bucket),
  );

  await loadTable<T.ConvexToolCall, unknown>(
    "toolCalls",
    schema.messageToolCalls as unknown as PgTable,
    (doc) => transformToolCall(doc, idMap),
  );

  await loadTable<T.ConvexSource, unknown>(
    "sources",
    schema.messageSources as unknown as PgTable,
    (doc) => transformSource(doc, idMap),
  );

  await loadTable<T.ConvexBookmark, unknown>(
    "bookmarks",
    schema.bookmarks as unknown as PgTable,
    (doc) => transformBookmark(doc, idMap),
  );

  await loadTable<T.ConvexVote, unknown>(
    "votes",
    schema.comparisonVotes as unknown as PgTable,
    (doc) => transformVote(doc, idMap),
  );

  // Insert side-effect rows from messages
  if (!options.dryRun) {
    if (voteRows.length > 0) {
      await batchInsert(
        db,
        schema.comparisonVotes as unknown as PgTable,
        voteRows,
        {
          batchSize,
        },
      );
    }
    if (consolidationRows.length > 0) {
      await batchInsert(
        db,
        schema.consolidations as unknown as PgTable,
        consolidationRows,
        { batchSize },
      );
    }
    if (routingRows.length > 0) {
      await batchInsert(
        db,
        schema.routingDecisions as unknown as PgTable,
        routingRows,
        { batchSize },
      );
    }
  }
  counts.comparisonVotes = voteRows.length;
  counts.consolidations = consolidationRows.length;
  counts.routingDecisions = routingRows.length;

  // ── Tier 6: Notes, tasks, remaining ──
  const noteEmbeddings: unknown[] = [];
  const noteDocs = await readTableFromZip<T.ConvexNote>(inputZip, "notes");
  const noteRows = noteDocs.map((doc) => {
    const { note, embedding } = transformNote(doc, idMap);
    if (embedding) noteEmbeddings.push(embedding);
    return note;
  });
  if (!options.dryRun && noteRows.length > 0) {
    const r = await batchInsert(
      db,
      schema.notes as unknown as PgTable,
      noteRows,
      { batchSize },
    );
    counts.notes = r.inserted;
  } else {
    counts.notes = noteRows.length;
  }

  const taskEmbeddings: unknown[] = [];
  const taskDocs = await readTableFromZip<T.ConvexTask>(inputZip, "tasks");
  const taskRows = taskDocs.map((doc) => {
    const { task, embedding } = transformTask(doc, idMap);
    if (embedding) taskEmbeddings.push(embedding);
    return task;
  });
  if (!options.dryRun && taskRows.length > 0) {
    const r = await batchInsert(
      db,
      schema.tasks as unknown as PgTable,
      taskRows,
      { batchSize },
    );
    counts.tasks = r.inserted;
  } else {
    counts.tasks = taskRows.length;
  }

  await loadTable<T.ConvexUsageRecord, unknown>(
    "usageRecords",
    schema.usageRecords as unknown as PgTable,
    (doc) => transformUsageRecord(doc, idMap),
  );

  await loadTable<T.ConvexFeedback, unknown>(
    "feedback",
    schema.feedbackEntries as unknown as PgTable,
    (doc) => transformFeedback(doc, idMap),
  );

  await loadTable<T.ConvexMemory, unknown>(
    "memories",
    schema.memoryEmbeddings as unknown as PgTable,
    (doc) => transformMemory(doc, idMap),
  );

  await loadTable<T.ConvexKnowledgeSource, unknown>(
    "knowledgeSources",
    schema.knowledgeSources as unknown as PgTable,
    (doc) => transformKnowledgeSource(doc, idMap),
  );

  await loadTable<T.ConvexKnowledgeChunk, unknown>(
    "knowledgeChunks",
    schema.knowledgeChunks as unknown as PgTable,
    (doc) => transformKnowledgeChunk(doc, idMap),
  );

  await loadTable<T.ConvexTtsCache, unknown>(
    "ttsCache",
    schema.ttsCache as unknown as PgTable,
    (doc) => transformTtsCache(doc, bucket),
  );

  await loadTable<T.ConvexShare, unknown>(
    "shares",
    schema.shares as unknown as PgTable,
    (doc) => transformShare(doc, idMap),
  );

  await loadTable<T.ConvexRoutingExample, unknown>(
    "routingExamples",
    schema.routingExamples as unknown as PgTable,
    (doc) => transformRoutingExample(doc, idMap),
  );

  // ── Second pass: Update conversations.activeLeafMessageId ──
  if (!options.dryRun) {
    const { eq } = await import("drizzle-orm");
    for (const doc of convexConversations) {
      if (doc.activeLeafMessageId) {
        const convId = idMap.get("conversations", doc._id);
        const leafId = idMap.getOptional("messages", doc.activeLeafMessageId);
        if (leafId) {
          await db
            .update(schema.conversations)
            .set({ activeLeafMessageId: leafId })
            .where(eq(schema.conversations.id, convId))
            .catch((err: Error) => {
              errors.push(
                `Failed to update activeLeafMessageId for ${convId}: ${err.message}`,
              );
            });
        }
      }
    }
  }

  return { idMap, counts, errors };
}
