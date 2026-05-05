import "server-only";
import {
  conversations,
  type UsageFeature,
  type UsageOperationType,
  usageRecords,
  users,
} from "@blah-chat/persistence-postgres";
import { and, desc, eq, gte, lte, type SQL, sql } from "drizzle-orm";
import { getPersistenceDb } from "./server";

/**
 * Shared usage analytics queries. Every helper takes an optional `userId`:
 *   - omitted → aggregates across all users (admin view)
 *   - present → scoped to that user (per-user `/usage/*` view)
 *
 * Date columns on `usage_records` are stored as ISO date strings ('YYYY-MM-DD')
 * so we filter via lexicographic compare. `cost` is double precision; tokens
 * are bigints summed via SQL aggregates.
 *
 * NOTE: column names match the real schema — `model` (not `modelId`),
 * `isByok` (not `usedByokKey`), `reasoningTokens` (not `cachedInputTokens`).
 */

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

function dateBetween(startDate?: string, endDate?: string): SQL | undefined {
  const filters: SQL[] = [];
  if (startDate) filters.push(gte(usageRecords.date, startDate));
  if (endDate) filters.push(lte(usageRecords.date, endDate));
  if (filters.length === 0) return undefined;
  return filters.length === 1 ? filters[0] : and(...filters);
}

function whereOf(opts: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}): SQL | undefined {
  const filters: SQL[] = [];
  if (opts.userId) filters.push(eq(usageRecords.userId, opts.userId));
  const range = dateBetween(opts.startDate, opts.endDate);
  if (range) filters.push(range);
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...filters);
}

function n(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

/* ── monthly total ───────────────────────────────────────────────── */

export async function getMonthlyTotal(opts: { userId?: string } = {}) {
  const db = getPersistenceDb();
  const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const where = whereOf({
    userId: opts.userId,
    startDate: `${month}-01`,
    endDate: `${month}-31`,
  });
  const [row] = await db
    .select({
      cost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
      tokens: sql<number>`coalesce(sum(${usageRecords.inputTokens} + ${usageRecords.outputTokens}), 0)`,
      messages: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
    })
    .from(usageRecords)
    .where(where);
  return {
    month,
    cost: n(row?.cost),
    tokens: n(row?.tokens),
    messages: n(row?.messages),
    // Budget is admin-tunable; kept as 0 here so consumers can blend with
    // adminSettings.limits.defaultMonthlyBudget client-side.
    budget: 0,
    percentUsed: 0,
  };
}

/* ── daily spend (last N days) ──────────────────────────────────── */

export async function getDailySpend(opts: { userId?: string; days?: number }) {
  const db = getPersistenceDb();
  const days = Math.max(1, Math.min(opts.days ?? 30, 365));
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - days + 1);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  const where = whereOf({ userId: opts.userId, startDate, endDate });
  const rows = await db
    .select({
      date: usageRecords.date,
      cost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
      tokens: sql<number>`coalesce(sum(${usageRecords.inputTokens} + ${usageRecords.outputTokens}), 0)`,
      messages: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
    })
    .from(usageRecords)
    .where(where)
    .groupBy(usageRecords.date)
    .orderBy(usageRecords.date);

  return rows.map((r) => ({
    date: r.date,
    cost: n(r.cost),
    tokens: n(r.tokens),
    messages: n(r.messages),
  }));
}

/* ── spend grouped by model ─────────────────────────────────────── */

export async function getSpendByModel(opts: {
  userId?: string;
  days?: number;
  startDate?: string;
  endDate?: string;
}) {
  const db = getPersistenceDb();
  let startDate = opts.startDate;
  let endDate = opts.endDate;
  if (opts.days && !startDate && !endDate) {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - opts.days + 1);
    startDate = start.toISOString().slice(0, 10);
    endDate = today.toISOString().slice(0, 10);
  }
  const where = whereOf({ userId: opts.userId, startDate, endDate });
  const rows = await db
    .select({
      model: usageRecords.model,
      cost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
      inputTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens}), 0)`,
      outputTokens: sql<number>`coalesce(sum(${usageRecords.outputTokens}), 0)`,
      reasoningTokens: sql<number>`coalesce(sum(${usageRecords.reasoningTokens}), 0)`,
      messages: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
    })
    .from(usageRecords)
    .where(where)
    .groupBy(usageRecords.model)
    .orderBy(desc(sql<number>`sum(${usageRecords.cost})`));

  return rows.map((r) => ({
    model: r.model,
    cost: n(r.cost),
    inputTokens: n(r.inputTokens),
    outputTokens: n(r.outputTokens),
    reasoningTokens: n(r.reasoningTokens),
    messages: n(r.messages),
  }));
}

/* ── conversation costs (top N) ─────────────────────────────────── */

export async function getConversationCosts(opts: {
  userId?: string;
  limit?: number;
}) {
  const db = getPersistenceDb();
  const limit = Math.max(1, Math.min(opts.limit ?? 10, 100));
  const where = opts.userId ? eq(usageRecords.userId, opts.userId) : undefined;

  const rows = await db
    .select({
      conversationId: usageRecords.conversationId,
      cost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
      tokens: sql<number>`coalesce(sum(${usageRecords.inputTokens} + ${usageRecords.outputTokens}), 0)`,
      messages: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
      title: conversations.title,
    })
    .from(usageRecords)
    .leftJoin(conversations, eq(conversations.id, usageRecords.conversationId))
    .where(where)
    .groupBy(usageRecords.conversationId, conversations.title)
    .orderBy(desc(sql<number>`sum(${usageRecords.cost})`))
    .limit(limit);

  return rows
    .filter((r) => !!r.conversationId)
    .map((r) => ({
      conversationId: r.conversationId as string,
      title: r.title ?? undefined,
      cost: n(r.cost),
      tokens: n(r.tokens),
      messages: n(r.messages),
    }));
}

/* ── cost by feature (chat/notes/tasks/files/memory) ────────────── */

const FEATURE_KEYS: UsageFeature[] = [
  "chat",
  "notes",
  "tasks",
  "files",
  "memory",
  "smart_assistant",
  "slides",
] as UsageFeature[];

const OP_KEYS: UsageOperationType[] = [
  "text",
  "tts",
  "stt",
  "image",
] as UsageOperationType[];

type CostByFeatureBucket = Record<
  string,
  { total: number; text: number; tts: number; stt: number; image: number }
>;

function emptyCostByFeatureMap(): CostByFeatureBucket {
  const out: CostByFeatureBucket = {};
  for (const f of FEATURE_KEYS) {
    out[f] = { total: 0, text: 0, tts: 0, stt: 0, image: 0 };
  }
  return out;
}

export async function getCostByFeature(opts: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = getPersistenceDb();
  const where = whereOf({
    userId: opts.userId,
    startDate: opts.startDate,
    endDate: opts.endDate,
  });
  const rows = await db
    .select({
      feature: usageRecords.feature,
      operation: usageRecords.operationType,
      cost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
    })
    .from(usageRecords)
    .where(where)
    .groupBy(usageRecords.feature, usageRecords.operationType);

  const out = emptyCostByFeatureMap();
  for (const r of rows) {
    if (!r.feature) continue;
    const featureKey = String(r.feature);
    const bucket = out[featureKey] ?? {
      total: 0,
      text: 0,
      tts: 0,
      stt: 0,
      image: 0,
    };
    out[featureKey] = bucket;
    const cost = n(r.cost);
    bucket.total += cost;
    if (r.operation && OP_KEYS.includes(r.operation as UsageOperationType)) {
      bucket[r.operation as keyof typeof bucket] =
        (bucket[r.operation as keyof typeof bucket] ?? 0) + cost;
    }
  }
  return out;
}

/* ── cost by type (text/voice/image) — derived from cost-by-feature  */

export async function getCostByType(opts: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = getPersistenceDb();
  const where = whereOf({
    userId: opts.userId,
    startDate: opts.startDate,
    endDate: opts.endDate,
  });
  const rows = await db
    .select({
      operation: usageRecords.operationType,
      cost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
    })
    .from(usageRecords)
    .where(where)
    .groupBy(usageRecords.operationType);

  const buckets = {
    textGeneration: { cost: 0, label: "Text" },
    tts: { cost: 0, label: "Voice (TTS)" },
    stt: { cost: 0, label: "Voice (STT)" },
    images: { cost: 0, label: "Images" },
  };
  for (const r of rows) {
    const cost = n(r.cost);
    if (r.operation === "text") buckets.textGeneration.cost += cost;
    else if (r.operation === "tts") buckets.tts.cost += cost;
    else if (r.operation === "stt") buckets.stt.cost += cost;
    else if (r.operation === "image") buckets.images.cost += cost;
  }
  return buckets;
}

/* ── activity stats: distinct days, total messages ──────────────── */

export async function getActivityStats(opts: { userId?: string } = {}) {
  const db = getPersistenceDb();
  const where = opts.userId ? eq(usageRecords.userId, opts.userId) : undefined;
  const [row] = await db
    .select({
      activeDays: sql<number>`count(distinct ${usageRecords.date})`,
      totalMessages: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
      totalCost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
    })
    .from(usageRecords)
    .where(where);
  return {
    activeDays: n(row?.activeDays),
    totalMessages: n(row?.totalMessages),
    totalCost: n(row?.totalCost),
  };
}

/* ── total counts (conversations, messages, tokens) ─────────────── */

export async function getTotalCounts(opts: { userId?: string } = {}) {
  const db = getPersistenceDb();
  const where = opts.userId ? eq(usageRecords.userId, opts.userId) : undefined;
  const [agg] = await db
    .select({
      messages: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
      tokens: sql<number>`coalesce(sum(${usageRecords.inputTokens} + ${usageRecords.outputTokens}), 0)`,
      conversations: sql<number>`count(distinct ${usageRecords.conversationId})`,
    })
    .from(usageRecords)
    .where(where);
  return {
    messages: n(agg?.messages),
    tokens: n(agg?.tokens),
    conversations: n(agg?.conversations),
  };
}

/* ── streaks ───────────────────────────────────────────────────── */

export async function getStreaks(opts: { userId?: string } = {}) {
  const db = getPersistenceDb();
  const where = opts.userId ? eq(usageRecords.userId, opts.userId) : undefined;
  const rows = await db
    .selectDistinct({ date: usageRecords.date })
    .from(usageRecords)
    .where(where)
    .orderBy(usageRecords.date);

  const dates = rows.map((r) => r.date);
  if (dates.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const cur = new Date(dates[i]);
    const diff = (cur.getTime() - prev.getTime()) / 86_400_000;
    if (Math.round(diff) === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // current = run ending at most-recent date if it's today/yesterday.
  const today = new Date().toISOString().slice(0, 10);
  const last = dates[dates.length - 1];
  let current = 0;
  if (last === today) {
    current = run;
  } else {
    const lastDate = new Date(last);
    const todayDate = new Date(today);
    const diff = (todayDate.getTime() - lastDate.getTime()) / 86_400_000;
    if (Math.round(diff) === 1) current = run;
  }

  return { current, longest };
}

/* ── heatmap: per-day counts for last N days ────────────────────── */

export async function getHeatmap(opts: { userId?: string; days?: number }) {
  const db = getPersistenceDb();
  const days = Math.max(1, Math.min(opts.days ?? 365, 730));
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - days + 1);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);
  const where = whereOf({ userId: opts.userId, startDate, endDate });

  const rows = await db
    .select({
      date: usageRecords.date,
      count: sql<number>`count(*)`,
      messages: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
    })
    .from(usageRecords)
    .where(where)
    .groupBy(usageRecords.date)
    .orderBy(usageRecords.date);

  return rows.map((r) => ({
    date: r.date,
    count: n(r.count),
    messages: n(r.messages),
  }));
}

/* ── percentile ranking ─────────────────────────────────────────── */

export async function getPercentileRanking(opts: { userId: string }) {
  const db = getPersistenceDb();
  // Per-user message totals across the population.
  const rows = await db
    .select({
      userId: usageRecords.userId,
      messages: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
    })
    .from(usageRecords)
    .groupBy(usageRecords.userId);

  if (rows.length === 0) {
    return { rank: 1, totalUsers: 1, percentile: 100, userMessages: 0 };
  }

  const sorted = rows
    .map((r) => ({ userId: r.userId, messages: n(r.messages) }))
    .sort((a, b) => b.messages - a.messages);
  const rankIdx = sorted.findIndex((r) => r.userId === opts.userId);
  const userMessages = rankIdx >= 0 ? sorted[rankIdx].messages : 0;
  const rank = rankIdx >= 0 ? rankIdx + 1 : sorted.length + 1;
  const totalUsers = sorted.length;
  const percentile =
    totalUsers > 0
      ? Math.round(((totalUsers - rank + 1) / totalUsers) * 100)
      : 0;
  return { rank, totalUsers, percentile, userMessages };
}

/* ── action stats: per-feature counts ───────────────────────────── */

export async function getActionStats(opts: { userId?: string } = {}) {
  const db = getPersistenceDb();
  const where = opts.userId ? eq(usageRecords.userId, opts.userId) : undefined;
  const rows = await db
    .select({
      feature: usageRecords.feature,
      count: sql<number>`count(*)`,
      cost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
    })
    .from(usageRecords)
    .where(where)
    .groupBy(usageRecords.feature);

  const out: Record<string, { count: number; cost: number }> = {};
  for (const r of rows) {
    const key = r.feature ? String(r.feature) : "unknown";
    out[key] = { count: n(r.count), cost: n(r.cost) };
  }
  return out;
}

/* ── byok breakdown ─────────────────────────────────────────────── */

export async function getByokBreakdown(opts: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = getPersistenceDb();
  const where = whereOf({
    userId: opts.userId,
    startDate: opts.startDate,
    endDate: opts.endDate,
  });
  const rows = await db
    .select({
      isByok: usageRecords.isByok,
      cost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
      messages: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
    })
    .from(usageRecords)
    .where(where)
    .groupBy(usageRecords.isByok);

  const result = {
    byok: { cost: 0, messages: 0 },
    platform: { cost: 0, messages: 0 },
  };
  for (const r of rows) {
    if (r.isByok === true) {
      result.byok.cost += n(r.cost);
      result.byok.messages += n(r.messages);
    } else {
      result.platform.cost += n(r.cost);
      result.platform.messages += n(r.messages);
    }
  }
  return result;
}

/* ── usage summary (high-level totals) ──────────────────────────── */

export async function getUsageSummary(opts: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = getPersistenceDb();
  const where = whereOf({
    userId: opts.userId,
    startDate: opts.startDate,
    endDate: opts.endDate,
  });
  const [row] = await db
    .select({
      totalCost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
      totalMessages: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
      totalInputTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens}), 0)`,
      totalOutputTokens: sql<number>`coalesce(sum(${usageRecords.outputTokens}), 0)`,
    })
    .from(usageRecords)
    .where(where);
  return {
    totalCost: n(row?.totalCost),
    totalMessages: n(row?.totalMessages),
    totalInputTokens: n(row?.totalInputTokens),
    totalOutputTokens: n(row?.totalOutputTokens),
  };
}

/* ── total user count (admin) ───────────────────────────────────── */

export async function getTotalUserCount() {
  const db = getPersistenceDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  return { count: n(row?.count) };
}
