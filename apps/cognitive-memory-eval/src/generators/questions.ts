import { z } from "zod";
import { loadConfig } from "../config";
import type { Conversation, Persona, Question } from "../types";
import { ensureDir, fileExists, readJson, writeJsonAtomic } from "../utils/fs";
import { llmGenerateObject } from "../utils/llm";
import { log } from "../utils/log";
import { dataPath } from "../utils/paths";

const questionSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  question: z.string(),
  type: z.enum(["factual", "temporal", "preference", "inference"]),
  expectedEvidence: z.array(z.string()).min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  sessionSpan: z.array(z.number().int()).min(1),
  reasoning: z.string(),
});

const questionsSchema = z.array(questionSchema).length(40);

function evidenceDigest(conversations: Conversation[]) {
  const rows: Array<{
    id: string;
    type: string;
    statement: string;
    session: number;
    importance: number;
    category: string;
  }> = [];
  for (const c of conversations) {
    for (const m of c.messages) {
      for (const e of m.evidence) {
        rows.push({
          id: e.id,
          type: e.type,
          statement: e.statement,
          session: c.sessionNumber,
          importance: e.importance,
          category: e.category,
        });
      }
    }
  }
  return rows
    .slice(0, 300)
    .map(
      (r) =>
        `- ${r.id} [s${r.session}] (${r.type}/${r.category}/imp:${r.importance}): ${r.statement}`,
    )
    .join("\n");
}

function promptFor(persona: Persona, conversations: Conversation[]) {
  return [
    "Given persona + evidence list, generate EXACTLY 40 questions. Return JSON array.",
    "Constraints:",
    "- distribution: 8 easy (recent, direct), 16 medium (older or competing), 16 hard (associations or inference)",
    "- type distribution approx: factual 35%, temporal 25%, preference 25%, inference 15%",
    "- each question MUST reference expectedEvidence ids that exist in evidence list",
    "- sessionSpan should reflect evidence session numbers used (e.g., [1,3])",
    `Persona: ${JSON.stringify(persona)}`,
    "Evidence:",
    evidenceDigest(conversations),
  ].join("\n");
}

export async function generateQuestions(options: {
  persona: Persona;
  conversations: Conversation[];
  force: boolean;
  dryRun: boolean;
}): Promise<Question[]> {
  const outPath = dataPath("questions", `${options.persona.id}.json`);
  if (fileExists(outPath) && !options.force)
    return readJson<Question[]>(outPath);
  if (options.dryRun) {
    if (!fileExists(outPath)) throw new Error(`dry-run: missing ${outPath}`);
    return readJson<Question[]>(outPath);
  }

  const cfg = loadConfig();
  await ensureDir(dataPath("questions"));

  log(`questions ${options.persona.id}`);
  const qs = await llmGenerateObject({
    modelId: cfg.models.questionGen,
    tag: "question-gen",
    schema: questionsSchema,
    prompt: promptFor(options.persona, options.conversations),
    temperature: 0.5,
  });

  const normalized = (qs as any[]).map((q, idx) => ({
    ...q,
    id: `q_${options.persona.id}_${String(idx + 1).padStart(2, "0")}`,
    personaId: options.persona.id,
  })) as Question[];

  await writeJsonAtomic(outPath, normalized);
  return normalized;
}
