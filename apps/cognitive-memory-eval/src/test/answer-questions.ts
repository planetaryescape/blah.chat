import { CognitiveMemory } from "@blah-chat/cognitive-memory";
import pLimit from "p-limit";
import { loadConfig } from "../config";
import { seedAdapters } from "../seeding/core";
import type { AnswerRow, Question } from "../types";
import { parseCommonFlags } from "../utils/cli";
import { embedCached } from "../utils/embeddings-cache";
import {
  appendJsonl,
  ensureDir,
  fileExists,
  readJson,
  writeJsonAtomic,
} from "../utils/fs";
import { llmGenerateText } from "../utils/llm";
import { counter, log, logBlank } from "../utils/log";
import { dataPath, resultsPath } from "../utils/paths";

function formatContext(memories: AnswerRow["retrievedMemories"]): string {
  return memories
    .map((m) => {
      const ts = Number((m.metadata as any)?.originalTimestamp ?? 0);
      const date = ts
        ? new Date(ts).toISOString().slice(0, 10)
        : "unknown-date";
      return `- [${date}] ${m.content}`;
    })
    .join("\n");
}

function buildAnswerPrompt(question: string, context: string) {
  return [
    "You are answering questions about a user based on past conversations.",
    "",
    "Here are relevant memories from past conversations:",
    context || "(none)",
    "",
    `Question: ${question}`,
    "",
    "Instructions:",
    "- Answer concisely and factually based on the provided memories",
    '- If you do not have enough information, say "I don\'t know" (do not guess)',
    '- Cite specific memories when answering (e.g., "Based on memory from 2026-02-05...")',
    "",
    "Answer:",
  ].join("\n");
}

async function main() {
  const flags = parseCommonFlags(process.argv.slice(2));
  const cfg = loadConfig();

  log(
    `answer start sample=${flags.sample ?? "all"} force=${flags.force} dryRun=${flags.dryRun} concurrency=${flags.concurrency ?? cfg.concurrency.answers}`,
  );
  const outPath = resultsPath("answers.jsonl");
  if (fileExists(outPath) && !flags.force) {
    log(`answer skip (exists) ${outPath}`);
    if (flags.dryRun) return;
    return;
  }
  if (flags.dryRun && !fileExists(outPath)) {
    throw new Error("dry-run: missing test-results/answers.jsonl");
  }

  const personasPath = dataPath("personas.json");
  if (!fileExists(personasPath))
    throw new Error("Missing test-data/personas.json; run gen first");
  const personas = readJson<Array<{ id: string }>>(personasPath);
  const slice = flags.sample
    ? personas.slice(0, flags.sample)
    : personas.slice(0, cfg.sizes.personas);
  const personaIds = slice.map((p) => p.id);

  const questions: Question[] = [];
  for (const personaId of personaIds) {
    const p = dataPath("questions", `${personaId}.json`);
    if (!fileExists(p)) throw new Error(`Missing ${p}; run gen first`);
    questions.push(...readJson<Question[]>(p));
  }

  await ensureDir(resultsPath());
  await writeJsonAtomic(resultsPath("answers-meta.json"), {
    at: Date.now(),
    personas: personaIds,
    questions: questions.length,
  });

  log(`questions=${questions.length}`);
  // Re-seed in this process to keep memory strengthening consistent within run.
  const seeded = await seedAdapters({ personaIds, dryRun: flags.dryRun });
  log("seedAdapters done");

  const cognitiveByPersona = new Map<string, CognitiveMemory>();
  for (const personaId of personaIds) {
    cognitiveByPersona.set(
      personaId,
      new CognitiveMemory({
        adapter: seeded.cognitiveAdapter as any,
        embeddingProvider: {
          embed: (t: string) => embedCached(t, { dryRun: flags.dryRun }),
        } as any,
        userId: personaId,
      }),
    );
  }

  const limit = cfg.retrieval.limit;
  const concurrency = flags.concurrency ?? cfg.concurrency.answers;
  const limiter = pLimit(concurrency);

  const rows: Promise<void>[] = [];
  let writeChain: Promise<void> = Promise.resolve();
  const writeRow = async (row: AnswerRow) => {
    writeChain = writeChain.then(() => appendJsonl(outPath, row));
    await writeChain;
  };

  logBlank();
  const prog = counter("answer", questions.length);
  for (const q of questions) {
    rows.push(
      limiter(async () => {
        const start = Date.now();

        const queryEmbedding = await embedCached(q.question, {
          dryRun: flags.dryRun,
        });
        const basicRetrieved = await seeded.basicAdapter.vectorSearch(
          queryEmbedding,
          {
            userId: q.personaId,
            limit,
          },
        );
        const basicTime = Date.now() - start;

        const cogStart = Date.now();
        const cognitive = cognitiveByPersona.get(q.personaId);
        if (!cognitive)
          throw new Error(`Missing cognitive instance for ${q.personaId}`);
        const cogRetrieved = await cognitive.retrieve({
          query: q.question,
          limit,
          includeAssociations: cfg.retrieval.includeAssociations,
        } as any);
        const cogTime = Date.now() - cogStart;

        const basicContext = formatContext(
          basicRetrieved.map((m) => ({
            id: m.id,
            content: m.content,
            relevanceScore: m.relevanceScore,
            finalScore: m.finalScore,
            retention: m.retention,
            metadata: m.metadata as any,
          })),
        );
        const cogContext = formatContext(
          cogRetrieved.map((m: any) => ({
            id: m.id,
            content: m.content,
            relevanceScore: m.relevanceScore,
            finalScore: m.finalScore,
            retention: m.retention,
            metadata: m.metadata as any,
          })),
        );

        const basicAnswer = await llmGenerateText({
          modelId: cfg.models.answerGen,
          tag: "answer-gen",
          temperature: 0.1,
          maxOutputTokens: 200,
          prompt: buildAnswerPrompt(q.question, basicContext),
          dryRun: flags.dryRun,
        });

        const cogAnswer = await llmGenerateText({
          modelId: cfg.models.answerGen,
          tag: "answer-gen",
          temperature: 0.1,
          maxOutputTokens: 200,
          prompt: buildAnswerPrompt(q.question, cogContext),
          dryRun: flags.dryRun,
        });

        const basicRow: AnswerRow = {
          questionId: q.id,
          personaId: q.personaId,
          variant: "basic",
          answer: basicAnswer,
          retrievedMemories: basicRetrieved.map((m) => ({
            id: m.id,
            content: m.content,
            relevanceScore: m.relevanceScore,
            finalScore: m.finalScore,
            retention: m.retention,
            metadata: m.metadata as any,
          })),
          timestamp: Date.now(),
          retrievalTimeMs: basicTime,
        };

        const cogRow: AnswerRow = {
          questionId: q.id,
          personaId: q.personaId,
          variant: "cognitive",
          answer: cogAnswer,
          retrievedMemories: cogRetrieved.map((m: any) => ({
            id: m.id,
            content: m.content,
            relevanceScore: m.relevanceScore,
            finalScore: m.finalScore,
            retention: m.retention,
            metadata: m.metadata as any,
          })),
          timestamp: Date.now(),
          retrievalTimeMs: cogTime,
        };

        await writeRow(basicRow);
        await writeRow(cogRow);
        prog.tick(q.id);
      }),
    );
  }

  await Promise.all(rows);
  log("answer done");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
