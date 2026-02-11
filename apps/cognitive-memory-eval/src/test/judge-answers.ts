import pLimit from "p-limit";
import { z } from "zod";
import { loadConfig } from "../config";
import {
  buildEvidenceIndex,
  loadConversationsForPersona,
} from "../seeding/core";
import type { AnswerRow, JudgmentRow, Question } from "../types";
import { parseCommonFlags } from "../utils/cli";
import {
  appendJsonl,
  ensureDir,
  fileExists,
  readJson,
  writeJsonAtomic,
} from "../utils/fs";
import { readJsonl } from "../utils/jsonl";
import { llmGenerateObject } from "../utils/llm";
import { dataPath, resultsPath } from "../utils/paths";

const judgmentSchema = z.object({
  accuracy: z.number().min(0).max(10),
  completeness: z.number().min(0).max(10),
  relevance: z.number().min(0).max(10),
  reasoning: z.string(),
});

function formatEvidence(
  evidenceIds: string[],
  evidenceById: Map<string, any>,
): string {
  const rows: string[] = [];
  for (const id of evidenceIds) {
    const e = evidenceById.get(id);
    if (!e) {
      rows.push(`- ${id}: (missing)`);
      continue;
    }
    rows.push(
      `- ${id} [s${e.sessionNumber}] (${e.category}/imp:${e.importance}): ${e.statement}`,
    );
  }
  return rows.join("\n");
}

function buildJudgePrompt(options: {
  question: string;
  groundTruth: string;
  answer: string;
}) {
  return [
    "You are evaluating answers to questions based on ground truth evidence.",
    "",
    `Question: ${options.question}`,
    "",
    "Ground Truth Evidence (from original conversations):",
    options.groundTruth || "(none)",
    "",
    `Answer to Judge: ${options.answer}`,
    "",
    "Evaluate the answer on three dimensions:",
    "",
    "1. Accuracy (0-10): Is the answer factually correct based on ground truth?",
    "2. Completeness (0-10): Does the answer include all relevant information from ground truth?",
    "3. Relevance (0-10): Does the answer directly address the question?",
    "",
    "Return JSON:",
    '{ "accuracy": <score>, "completeness": <score>, "relevance": <score>, "reasoning": "<brief explanation of scores>" }',
  ].join("\n");
}

async function main() {
  const flags = parseCommonFlags(process.argv.slice(2));
  const cfg = loadConfig();

  const answersPath = resultsPath("answers.jsonl");
  const outPath = resultsPath("judgments.jsonl");

  if (!fileExists(answersPath))
    throw new Error("Missing test-results/answers.jsonl; run answer first");
  if (fileExists(outPath) && !flags.force) {
    if (flags.dryRun) return;
    return;
  }
  if (flags.dryRun && !fileExists(outPath)) {
    throw new Error("dry-run: missing test-results/judgments.jsonl");
  }

  const answers = await readJsonl<AnswerRow>(answersPath);
  const personaIds = Array.from(new Set(answers.map((a) => a.personaId)));

  const questions: Question[] = [];
  for (const personaId of personaIds) {
    const p = dataPath("questions", `${personaId}.json`);
    if (!fileExists(p)) throw new Error(`Missing ${p}; run gen first`);
    questions.push(...readJson<Question[]>(p));
  }
  const questionById = new Map<string, Question>(
    questions.map((q) => [q.id, q]),
  );

  const evidenceById = new Map<string, any>();
  for (const personaId of personaIds) {
    const convs = loadConversationsForPersona(personaId);
    const idx = buildEvidenceIndex(convs);
    for (const [id, row] of idx.entries()) evidenceById.set(id, row);
  }

  await ensureDir(resultsPath());
  await writeJsonAtomic(resultsPath("judgments-meta.json"), {
    at: Date.now(),
    personas: personaIds,
    answers: answers.length,
  });

  const concurrency = flags.concurrency ?? cfg.concurrency.judge;
  const limiter = pLimit(concurrency);

  let writeChain: Promise<void> = Promise.resolve();
  const writeRow = async (row: JudgmentRow) => {
    writeChain = writeChain.then(() => appendJsonl(outPath, row));
    await writeChain;
  };

  await Promise.all(
    answers.map((a) =>
      limiter(async () => {
        const q = questionById.get(a.questionId);
        if (!q) throw new Error(`Missing question ${a.questionId}`);

        const groundTruth = formatEvidence(q.expectedEvidence, evidenceById);
        const judged = await llmGenerateObject({
          modelId: cfg.models.judge,
          tag: "judge",
          schema: judgmentSchema,
          prompt: buildJudgePrompt({
            question: q.question,
            groundTruth,
            answer: a.answer,
          }),
          temperature: 0,
          dryRun: flags.dryRun,
        });

        const row: JudgmentRow = {
          questionId: a.questionId,
          personaId: a.personaId,
          variant: a.variant,
          accuracy: (judged as any).accuracy,
          completeness: (judged as any).completeness,
          relevance: (judged as any).relevance,
          reasoning: (judged as any).reasoning,
          timestamp: Date.now(),
        };

        await writeRow(row);
      }),
    ),
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
