import { loadConfig } from "../config";
import type { AnswerRow, JudgmentRow, Question } from "../types";
import { parseCommonFlags } from "../utils/cli";
import { ensureDir, fileExists, readJson, writeJsonAtomic } from "../utils/fs";
import { readJsonl } from "../utils/jsonl";
import { log } from "../utils/log";
import { dataPath, resultsPath } from "../utils/paths";
import { calculateMetrics } from "./calculate-metrics";
import { pairedTTest } from "./statistical-tests";
import { writeVisualizations } from "./visualizations";

function overall(j: JudgmentRow): number {
  return (j.accuracy + j.completeness + j.relevance) / 3;
}

function checkbox(ok: boolean): string {
  return ok ? "- [x]" : "- [ ]";
}

async function loadQuestions(personaIds: string[]): Promise<Question[]> {
  const out: Question[] = [];
  for (const personaId of personaIds) {
    const p = dataPath("questions", `${personaId}.json`);
    if (!fileExists(p)) throw new Error(`Missing ${p}; run gen first`);
    out.push(...readJson<Question[]>(p));
  }
  return out;
}

async function main() {
  const flags = parseCommonFlags(process.argv.slice(2));
  const cfg = loadConfig();

  log(
    `analyze start sample=${flags.sample ?? "all"} force=${flags.force} dryRun=${flags.dryRun}`,
  );
  const answersPath = resultsPath("answers.jsonl");
  const judgmentsPath = resultsPath("judgments.jsonl");
  if (!fileExists(answersPath))
    throw new Error("Missing test-results/answers.jsonl; run answer first");
  if (!fileExists(judgmentsPath))
    throw new Error("Missing test-results/judgments.jsonl; run judge first");

  const answers = await readJsonl<AnswerRow>(answersPath);
  const judgments = await readJsonl<JudgmentRow>(judgmentsPath);

  const personaIdsAll = Array.from(new Set(answers.map((a) => a.personaId)));
  const personaIds =
    flags.sample && flags.sample > 0
      ? personaIdsAll.slice(0, flags.sample)
      : personaIdsAll;

  const questions = await loadQuestions(personaIds);
  const metrics = calculateMetrics({ answers, judgments, questions });

  // paired diffs per questionId: cognitive - basic (overall)
  const jByKey = new Map<string, JudgmentRow>();
  for (const j of judgments) jByKey.set(`${j.questionId}|${j.variant}`, j);

  const diffs: number[] = [];
  for (const q of questions) {
    const b = jByKey.get(`${q.id}|basic`);
    const c = jByKey.get(`${q.id}|cognitive`);
    if (!b || !c) continue;
    diffs.push(overall(c) - overall(b));
  }

  const stats = pairedTTest(diffs);

  await ensureDir(resultsPath());
  await writeJsonAtomic(resultsPath("metrics.json"), metrics);
  await writeJsonAtomic(resultsPath("stats.json"), {
    at: Date.now(),
    ...stats,
  });
  await writeVisualizations({ metrics });
  log("wrote metrics.json stats.json report.md visualizations/*");

  const basic = metrics.variants.basic;
  const cognitive = metrics.variants.cognitive;

  const upliftPct =
    basic.overallScore === 0
      ? 0
      : ((cognitive.overallScore - basic.overallScore) / basic.overallScore) *
        100;

  const primaryOk = upliftPct >= 10 && stats.pValue < 0.05;
  const mediumOk =
    basic.byDifficulty.medium === 0
      ? false
      : ((cognitive.byDifficulty.medium - basic.byDifficulty.medium) /
          basic.byDifficulty.medium) *
          100 >=
        15;
  const hardOk =
    basic.byDifficulty.hard === 0
      ? false
      : ((cognitive.byDifficulty.hard - basic.byDifficulty.hard) /
          basic.byDifficulty.hard) *
          100 >=
        30;
  const decayOk =
    cognitive.bySession.session4 === 0
      ? false
      : Math.abs(cognitive.bySession.session1 - cognitive.bySession.session4) /
          cognitive.bySession.session4 <=
        0.15;

  const report = [
    "# Cognitive Memory Eval Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    `- basic overall: ${basic.overallScore.toFixed(2)}`,
    `- cognitive overall: ${cognitive.overallScore.toFixed(2)}`,
    `- uplift: ${upliftPct.toFixed(1)}%`,
    `- paired t-test p: ${Number.isFinite(stats.pValue) ? stats.pValue.toExponential(3) : "NaN"}`,
    `- effect size (dz): ${stats.effectSizeDz.toFixed(2)}`,
    `- mean diff: ${stats.meanDiff.toFixed(3)} (95% CI ${stats.ci95.low.toFixed(3)}..${stats.ci95.high.toFixed(3)})`,
    "",
    "## Success Criteria",
    `${checkbox(primaryOk)} Primary: cognitive overall > basic by >= 10% and p < 0.05`,
    `${checkbox(mediumOk)} Medium: cognitive > basic by >= 15%`,
    `${checkbox(hardOk)} Hard: cognitive > basic by >= 30%`,
    `${checkbox(decayOk)} Decay resilience: session1 within 15% of session4 (cognitive)`,
    "",
    "## Breakdown",
    "### By Difficulty (overall)",
    `- basic: easy ${basic.byDifficulty.easy.toFixed(2)}, medium ${basic.byDifficulty.medium.toFixed(2)}, hard ${basic.byDifficulty.hard.toFixed(2)}`,
    `- cognitive: easy ${cognitive.byDifficulty.easy.toFixed(2)}, medium ${cognitive.byDifficulty.medium.toFixed(2)}, hard ${cognitive.byDifficulty.hard.toFixed(2)}`,
    "",
    "### By Type (overall)",
    `- basic: factual ${basic.byType.factual.toFixed(2)}, temporal ${basic.byType.temporal.toFixed(2)}, preference ${basic.byType.preference.toFixed(2)}, inference ${basic.byType.inference.toFixed(2)}`,
    `- cognitive: factual ${cognitive.byType.factual.toFixed(2)}, temporal ${cognitive.byType.temporal.toFixed(2)}, preference ${cognitive.byType.preference.toFixed(2)}, inference ${cognitive.byType.inference.toFixed(2)}`,
    "",
    "### By Session (overall)",
    `- basic: s1 ${basic.bySession.session1.toFixed(2)}, s2 ${basic.bySession.session2.toFixed(2)}, s3 ${basic.bySession.session3.toFixed(2)}, s4 ${basic.bySession.session4.toFixed(2)}`,
    `- cognitive: s1 ${cognitive.bySession.session1.toFixed(2)}, s2 ${cognitive.bySession.session2.toFixed(2)}, s3 ${cognitive.bySession.session3.toFixed(2)}, s4 ${cognitive.bySession.session4.toFixed(2)}`,
    "",
    "## Visualizations",
    "- visualizations/overall-scores.html",
    "- visualizations/by-difficulty.html",
    "- visualizations/by-type.html",
    "- visualizations/decay-curve.html",
    "- visualizations/retrieval-heatmap.html",
    "",
    "## Config",
    "```json",
    JSON.stringify(cfg, null, 2),
    "```",
    "",
  ].join("\n");

  await Bun.write(resultsPath("report.md"), report);
  log("analyze done");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
