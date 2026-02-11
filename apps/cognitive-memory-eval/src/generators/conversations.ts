import { z } from "zod";
import { loadConfig } from "../config";
import type { Conversation, Evidence, Message, Persona } from "../types";
import { ensureDir, fileExists, readJson, writeJsonAtomic } from "../utils/fs";
import { llmGenerateObject } from "../utils/llm";
import { log } from "../utils/log";
import { dataPath } from "../utils/paths";

const evidenceSchema = z.object({
  id: z.string(),
  type: z.enum(["factual", "temporal", "preference", "opinion"]),
  statement: z.string(),
  importance: z.number().min(0).max(1),
  category: z.string(),
});

const messageSchema = z.object({
  role: z.literal("user"),
  content: z.string(),
  timestamp: z.number(),
  evidence: z.array(evidenceSchema),
});

const conversationSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  sessionNumber: z.number().int().min(1).max(4),
  timestamp: z.number(),
  messages: z.array(messageSchema).min(6).max(14),
});

function sessionBase(now: number, sessionNumber: number): number {
  const day = 24 * 60 * 60 * 1000;
  if (sessionNumber === 1) return now - 42 * day;
  if (sessionNumber === 2) return now - 28 * day;
  if (sessionNumber === 3) return now - 14 * day;
  return now - 3 * day;
}

function promptFor(persona: Persona, sessionNumber: number, sessionTs: number) {
  return [
    "Generate a realistic conversation. Return JSON matching schema. User messages only.",
    `Persona: ${JSON.stringify(persona)}`,
    `Session: ${sessionNumber} of 4`,
    `Backdated session timestamp (ms): ${sessionTs}`,
    "Requirements:",
    "- 8-12 user messages, varied length",
    "- each message: content + evidence array",
    "- evidence types distribution approx: factual 40%, temporal 20%, preference 25%, opinion 15%",
    "- importance 0..1",
    "- evidence.category short label (travel/work/family/etc)",
  ].join("\n");
}

export async function generateConversations(options: {
  personas: Persona[];
  sessionsPerPersona: number;
  force: boolean;
  dryRun: boolean;
}): Promise<void> {
  const cfg = loadConfig();
  const now = Date.now();

  for (const persona of options.personas) {
    for (
      let sessionNumber = 1;
      sessionNumber <= options.sessionsPerPersona;
      sessionNumber++
    ) {
      const dir = dataPath("conversations", persona.id);
      const outPath = dataPath(
        "conversations",
        persona.id,
        `session_${sessionNumber}.json`,
      );
      if (fileExists(outPath) && !options.force) continue;
      if (options.dryRun) {
        if (!fileExists(outPath))
          throw new Error(`dry-run: missing ${outPath}`);
        continue;
      }

      log(
        `conversation ${persona.id} session ${sessionNumber}/${options.sessionsPerPersona}`,
      );
      await ensureDir(dir);
      const sessionTs = sessionBase(now, sessionNumber);
      const conv = await llmGenerateObject({
        modelId: cfg.models.conversationGen,
        tag: "conversation-gen",
        schema: conversationSchema,
        prompt: promptFor(persona, sessionNumber, sessionTs),
        temperature: 0.7,
      });

      const normalized: Conversation = {
        ...(conv as any),
        id: `conv_${persona.id}_session_${String(sessionNumber).padStart(2, "0")}`,
        personaId: persona.id,
        sessionNumber,
        timestamp: sessionTs,
        messages: (conv as any).messages.map((m: Message, idx: number) => {
          const t = sessionTs + idx * 10 * 60 * 1000;
          const evidence = (m.evidence || []).map(
            (e: Evidence, eidx: number) => ({
              ...e,
              id: `${persona.id}_s${sessionNumber}_m${idx + 1}_e${eidx + 1}`,
            }),
          );
          return { ...m, role: "user", timestamp: t, evidence };
        }),
      };

      await writeJsonAtomic(outPath, normalized);
    }
  }
}

export function loadConversations(personaId: string): Conversation[] {
  const base = dataPath("conversations", personaId);
  const out: Conversation[] = [];
  for (let s = 1; s <= 4; s++) {
    const p = `${base}/session_${s}.json`;
    if (!fileExists(p)) continue;
    out.push(readJson<Conversation>(p));
  }
  return out.sort((a, b) => a.sessionNumber - b.sessionNumber);
}
