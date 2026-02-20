export const JUDGE_RUBRIC = [
  "Accuracy (0-10): factually correct vs ground truth evidence only.",
  "Completeness (0-10): includes all relevant facts from ground truth evidence.",
  "Relevance (0-10): directly answers the question asked.",
  'If evidence is insufficient, best answer is "I don\'t know".',
].join("\n");

export function buildJudgePrompt(options: {
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
    "Rubric:",
    JUDGE_RUBRIC,
    "",
    "Return strict JSON only:",
    '{ "accuracy": <0-10>, "completeness": <0-10>, "relevance": <0-10>, "reasoning": "<brief explanation>" }',
  ].join("\n");
}
