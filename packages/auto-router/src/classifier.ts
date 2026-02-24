/**
 * Classifier Engine
 *
 * Core classification logic: hard rules -> embedding similarity -> route label.
 * Pure functions, no I/O. Embeddings are passed in, not fetched.
 */

import { runHardRules } from "./hard-rules";
import type {
  ClassifierConfig,
  ClassifierResult,
  RouteLabel,
  RoutingExample,
} from "./types";
import { DEFAULT_CLASSIFIER_CONFIG, ROUTE_LABELS } from "./types";

/**
 * Cosine similarity between two vectors.
 * Inlined to avoid cross-package dependency for this simple function.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

interface ClassifyInput {
  message: string;
  messageEmbedding: number[];
  examples: (RoutingExample & { embedding: number[] })[];
  hasAttachments?: boolean;
  attachmentTypes?: string[];
  currentContextTokens?: number;
  config?: ClassifierConfig;
}

/**
 * Classify a message into a route label using hard rules + embedding similarity.
 *
 * Returns the route label, confidence, and whether an LLM fallback is needed.
 */
export function classify(input: ClassifyInput): ClassifierResult {
  const config = input.config ?? DEFAULT_CLASSIFIER_CONFIG;

  // Stage 1: Hard rules (deterministic, <1ms)
  const hardRuleResult = runHardRules({
    message: input.message,
    hasAttachments: input.hasAttachments ?? false,
    attachmentTypes: input.attachmentTypes,
    currentContextTokens: input.currentContextTokens,
  });

  if (hardRuleResult) {
    return hardRuleResult;
  }

  // Stage 2: Embedding similarity (top-K weighted voting)
  if (input.examples.length === 0) {
    return {
      routeLabel: "fallback_default",
      confidence: 0,
      needsFallback: config.fallbackEnabled,
      candidateLabels: [...ROUTE_LABELS],
    };
  }

  // Compute similarities
  const scored = input.examples.map((example) => ({
    routeLabel: example.routeLabel,
    similarity: cosineSimilarity(input.messageEmbedding, example.embedding),
  }));

  // Sort by similarity descending
  scored.sort((a, b) => b.similarity - a.similarity);

  // Top-K weighted voting
  const topK = scored.slice(0, config.topK);
  const labelScores = new Map<RouteLabel, number>();

  for (let i = 0; i < topK.length; i++) {
    const { routeLabel, similarity } = topK[i];
    // Weight by similarity score (higher similarity = more influence)
    const current = labelScores.get(routeLabel) ?? 0;
    labelScores.set(routeLabel, current + similarity);
  }

  // Sort labels by aggregated score
  const sortedLabels = [...labelScores.entries()].sort((a, b) => b[1] - a[1]);

  if (sortedLabels.length === 0) {
    return {
      routeLabel: "fallback_default",
      confidence: 0,
      needsFallback: config.fallbackEnabled,
      candidateLabels: [...ROUTE_LABELS],
    };
  }

  const [topLabel, topScore] = sortedLabels[0];
  const [secondLabel, secondScore] = sortedLabels[1] ?? [
    "fallback_default" as RouteLabel,
    0,
  ];

  // Normalize confidence: top score relative to sum of all scores
  const totalScore = sortedLabels.reduce((sum, [, score]) => sum + score, 0);
  const confidence = totalScore > 0 ? topScore / totalScore : 0;

  const topSimilarity = topK[0]?.similarity ?? 0;

  // Check confidence threshold and margin
  const meetsThreshold = confidence >= config.confidenceThreshold;
  const meetsMargin =
    sortedLabels.length < 2 ||
    confidence - secondScore / totalScore >= config.marginThreshold;

  if (meetsThreshold && meetsMargin) {
    return {
      routeLabel: topLabel,
      confidence,
      needsFallback: false,
      topSimilarityScore: topSimilarity,
      secondRouteLabel: secondLabel,
      secondSimilarityScore: topK.find((s) => s.routeLabel === secondLabel)
        ?.similarity,
    };
  }

  // Below threshold: needs LLM fallback
  const candidateLabels = sortedLabels.slice(0, 3).map(([label]) => label);

  return {
    routeLabel: topLabel,
    confidence,
    needsFallback: config.fallbackEnabled,
    candidateLabels,
    topSimilarityScore: topSimilarity,
    secondRouteLabel: secondLabel,
    secondSimilarityScore: topK.find((s) => s.routeLabel === secondLabel)
      ?.similarity,
  };
}
