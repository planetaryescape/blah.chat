import { createHash } from "node:crypto";
import type { MemoryType } from "@blah-chat/cognitive-memory";
import {
  CognitiveMemory,
  calculateRetention,
  InMemoryAdapter,
  updateStability,
} from "@blah-chat/cognitive-memory";
import { loadConfig } from "../config";
import type { Conversation, Evidence } from "../types";
import { embedCached } from "../utils/embeddings-cache";
import { fileExists, readJson } from "../utils/fs";
import { dataPath } from "../utils/paths";

export type EvidenceIndexRow = {
  personaId: string;
  conversationId: string;
  sessionNumber: number;
  timestamp: number;
  statement: string;
  importance: number;
  category: string;
  type: Evidence["type"];
};

export function loadConversationsForPersona(personaId: string): Conversation[] {
  const base = dataPath("conversations", personaId);
  const out: Conversation[] = [];
  for (let s = 1; s <= 4; s++) {
    const p = `${base}/session_${s}.json`;
    if (!fileExists(p)) continue;
    out.push(readJson<Conversation>(p));
  }
  return out.sort((a, b) => a.sessionNumber - b.sessionNumber);
}

export function buildEvidenceIndex(conversations: Conversation[]) {
  const index = new Map<string, EvidenceIndexRow>();
  for (const c of conversations) {
    for (const m of c.messages) {
      for (const e of m.evidence) {
        index.set(e.id, {
          personaId: c.personaId,
          conversationId: c.id,
          sessionNumber: c.sessionNumber,
          timestamp: m.timestamp,
          statement: e.statement,
          importance: e.importance,
          category: e.category,
          type: e.type,
        });
      }
    }
  }
  return index;
}

function memoryTypeFor(e: EvidenceIndexRow): MemoryType {
  if (e.type === "temporal") return "episodic";
  return "semantic";
}

function ymd(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function seeded01(seed: string, key: string): number {
  const h = createHash("sha256")
    .update(`${seed}:${key}`)
    .digest("hex")
    .slice(0, 8);
  return Number.parseInt(h, 16) / 0xffffffff;
}

async function seedVariantForPersona(options: {
  variant: "basic" | "cognitive";
  personaId: string;
  conversations: Conversation[];
  adapter: InMemoryAdapter;
  dryRun: boolean;
}) {
  const evidenceIndex = buildEvidenceIndex(options.conversations);
  const idsByEvidence = new Map<string, string>();

  for (const [evidenceId, row] of evidenceIndex.entries()) {
    const content = `${row.personaId} said: "${row.statement}" on ${ymd(row.timestamp)}`;
    const embedding = await embedCached(content, { dryRun: options.dryRun });
    const memoryType = memoryTypeFor(row);
    const stability = 0.3;
    const importance = row.importance;
    const lastAccessed = row.timestamp;
    const accessCount = 0;
    const retention =
      options.variant === "basic"
        ? 1.0
        : calculateRetention({
            stability,
            importance,
            lastAccessed,
            memoryType,
          });

    const id = await options.adapter.createMemory({
      userId: row.personaId,
      content,
      embedding,
      memoryType,
      importance,
      stability,
      accessCount,
      lastAccessed,
      retention,
      metadata: {
        evidenceId,
        category: row.category,
        sessionNumber: row.sessionNumber,
        originalTimestamp: row.timestamp,
        conversationId: row.conversationId,
      },
    } as any);

    idsByEvidence.set(evidenceId, id);
  }

  if (options.variant === "cognitive") {
    const cfg = loadConfig();
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const sessionBase: Record<number, number> = {
      1: now - 42 * day,
      2: now - 28 * day,
      3: now - 14 * day,
      4: now - 3 * day,
    };

    // Simulate accesses (deterministic)
    for (const m of options.adapter.memories.values()) {
      if (m.userId !== options.personaId) continue;
      const sessionNumber = Number((m.metadata as any)?.sessionNumber ?? 4);
      const roll = seeded01(cfg.seed, m.id);
      let extra = 0;
      if (sessionNumber === 4 && roll < 0.3) extra = 1;
      else if (sessionNumber === 3 && roll < 0.15) extra = 1;
      else if ((sessionNumber === 1 || sessionNumber === 2) && roll < 0.05)
        extra = 2;
      if (extra === 0) continue;

      const baseTs = sessionBase[sessionNumber] ?? m.lastAccessed;
      const simulatedLast = baseTs + 12 * 60 * 60 * 1000;
      const daysSince = Math.max(0, (simulatedLast - m.lastAccessed) / day);
      const newStability = updateStability(m.stability, daysSince);
      await options.adapter.updateMemory(m.id, {
        accessCount: m.accessCount + extra,
        lastAccessed: simulatedLast,
        stability: newStability,
      } as any);
    }

    // Associations (same category, within persona only)
    const byCategory = new Map<string, Array<{ id: string; ts: number }>>();
    for (const m of options.adapter.memories.values()) {
      if (m.userId !== options.personaId) continue;
      const cat = String((m.metadata as any)?.category ?? "general");
      const ts = Number((m.metadata as any)?.originalTimestamp ?? m.createdAt);
      const arr = byCategory.get(cat) ?? [];
      arr.push({ id: m.id, ts });
      byCategory.set(cat, arr);
    }
    for (const arr of byCategory.values()) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const daysBetween = Math.abs(arr[i].ts - arr[j].ts) / day;
          const strength = daysBetween < 7 ? 0.7 : daysBetween < 21 ? 0.5 : 0.3;
          await options.adapter.createOrStrengthenLink(
            arr[i].id,
            arr[j].id,
            strength,
          );
        }
      }
    }

    const mem = new CognitiveMemory({
      adapter: options.adapter as any,
      embeddingProvider: {
        embed: (t: string) => embedCached(t, { dryRun: options.dryRun }),
      } as any,
      userId: options.personaId,
    });
    await mem.refreshRetentionScores();
  }

  return { evidenceIndex, count: evidenceIndex.size };
}

export async function seedAdapters(options: {
  personaIds: string[];
  dryRun: boolean;
}): Promise<{
  basicAdapter: InMemoryAdapter;
  cognitiveAdapter: InMemoryAdapter;
  evidenceById: Map<string, EvidenceIndexRow>;
  counts: Record<"basic" | "cognitive", number>;
  byPersona: Record<string, { basic: number; cognitive: number }>;
}> {
  const basicAdapter = new InMemoryAdapter();
  const cognitiveAdapter = new InMemoryAdapter();

  const evidenceById = new Map<string, EvidenceIndexRow>();
  const counts = { basic: 0, cognitive: 0 };
  const byPersona: Record<string, { basic: number; cognitive: number }> = {};

  for (const personaId of options.personaIds) {
    const conversations = loadConversationsForPersona(personaId);
    if (conversations.length === 0)
      throw new Error(`No conversations for ${personaId}`);

    const basic = await seedVariantForPersona({
      variant: "basic",
      personaId,
      conversations,
      adapter: basicAdapter,
      dryRun: options.dryRun,
    });
    const cog = await seedVariantForPersona({
      variant: "cognitive",
      personaId,
      conversations,
      adapter: cognitiveAdapter,
      dryRun: options.dryRun,
    });

    for (const [id, row] of basic.evidenceIndex.entries())
      evidenceById.set(id, row);
    counts.basic += basic.count;
    counts.cognitive += cog.count;
    byPersona[personaId] = { basic: basic.count, cognitive: cog.count };
  }

  return { basicAdapter, cognitiveAdapter, evidenceById, counts, byPersona };
}
