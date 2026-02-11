import type {
  AnswerRow,
  JudgmentRow,
  Question,
  VariantMetrics,
} from "../types";

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function overall(j: JudgmentRow): number {
  return (j.accuracy + j.completeness + j.relevance) / 3;
}

function sessionBucket(
  q: Question,
): "session1" | "session2" | "session3" | "session4" {
  const s = q.sessionSpan.length ? Math.min(...q.sessionSpan) : 4;
  if (s <= 1) return "session1";
  if (s === 2) return "session2";
  if (s === 3) return "session3";
  return "session4";
}

export type MetricsOutput = {
  at: number;
  variants: Record<"basic" | "cognitive", VariantMetrics>;
};

export function calculateMetrics(options: {
  answers: AnswerRow[];
  judgments: JudgmentRow[];
  questions: Question[];
}): MetricsOutput {
  const qById = new Map(options.questions.map((q) => [q.id, q]));
  const jByKey = new Map<string, JudgmentRow>();
  for (const j of options.judgments) {
    jByKey.set(`${j.questionId}|${j.variant}`, j);
  }

  const variants: Record<"basic" | "cognitive", VariantMetrics> = {
    basic: {
      variant: "basic",
      overallScore: 0,
      accuracy: 0,
      completeness: 0,
      relevance: 0,
      byType: { factual: 0, temporal: 0, preference: 0, inference: 0 },
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      bySession: { session1: 0, session2: 0, session3: 0, session4: 0 },
      avgRetrievalTimeMs: 0,
      avgMemoriesRetrieved: 0,
      n: 0,
    },
    cognitive: {
      variant: "cognitive",
      overallScore: 0,
      accuracy: 0,
      completeness: 0,
      relevance: 0,
      byType: { factual: 0, temporal: 0, preference: 0, inference: 0 },
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      bySession: { session1: 0, session2: 0, session3: 0, session4: 0 },
      avgRetrievalTimeMs: 0,
      avgMemoriesRetrieved: 0,
      n: 0,
    },
  };

  for (const v of ["basic", "cognitive"] as const) {
    const answers = options.answers.filter((a) => a.variant === v);

    const js = answers
      .map((a) => jByKey.get(`${a.questionId}|${a.variant}`))
      .filter(Boolean) as JudgmentRow[];

    variants[v].n = js.length;
    variants[v].accuracy = mean(js.map((j) => j.accuracy));
    variants[v].completeness = mean(js.map((j) => j.completeness));
    variants[v].relevance = mean(js.map((j) => j.relevance));
    variants[v].overallScore = mean(js.map(overall));
    variants[v].avgRetrievalTimeMs = mean(
      answers.map((a) => a.retrievalTimeMs),
    );
    variants[v].avgMemoriesRetrieved = mean(
      answers.map((a) => a.retrievedMemories.length),
    );

    for (const type of [
      "factual",
      "temporal",
      "preference",
      "inference",
    ] as const) {
      const bucket = answers
        .map((a) => {
          const q = qById.get(a.questionId);
          const j = jByKey.get(`${a.questionId}|${a.variant}`);
          if (!q || !j) return null;
          return q.type === type ? overall(j) : null;
        })
        .filter((x): x is number => typeof x === "number");
      variants[v].byType[type] = mean(bucket);
    }

    for (const diff of ["easy", "medium", "hard"] as const) {
      const bucket = answers
        .map((a) => {
          const q = qById.get(a.questionId);
          const j = jByKey.get(`${a.questionId}|${a.variant}`);
          if (!q || !j) return null;
          return q.difficulty === diff ? overall(j) : null;
        })
        .filter((x): x is number => typeof x === "number");
      variants[v].byDifficulty[diff] = mean(bucket);
    }

    for (const s of ["session1", "session2", "session3", "session4"] as const) {
      const bucket = answers
        .map((a) => {
          const q = qById.get(a.questionId);
          const j = jByKey.get(`${a.questionId}|${a.variant}`);
          if (!q || !j) return null;
          return sessionBucket(q) === s ? overall(j) : null;
        })
        .filter((x): x is number => typeof x === "number");
      variants[v].bySession[s] = mean(bucket);
    }
  }

  return { at: Date.now(), variants };
}
