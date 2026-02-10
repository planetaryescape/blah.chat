/**
 * Importance scoring utilities
 *
 * Helpers for automatically scoring memory importance.
 * Can be extended with LLM-based scoring.
 */

import type { MemoryType } from "../core/types";

/**
 * Score importance based on heuristics
 *
 * This is a simplified version. For production, use LLM-based scoring
 * (replace with LLM-based scoring).
 *
 * Heuristics:
 * - Length (longer = potentially more important)
 * - Contains decision words (decided, chose, will, must)
 * - Contains personal markers (I, my, we, our)
 * - Contains temporal markers (yesterday, tomorrow, next week)
 *
 * @param text Memory content
 * @returns Importance score (0.0-1.0)
 */
export function scoreImportance(text: string): number {
  let score = 0.3; // Base score

  const lowerText = text.toLowerCase();

  // Length scoring (up to +0.2)
  const lengthScore = Math.min(0.2, text.length / 500);
  score += lengthScore;

  // Decision words (+0.15)
  const decisionWords = [
    "decided",
    "chose",
    "will",
    "must",
    "should",
    "need to",
    "plan to",
  ];
  if (decisionWords.some((word) => lowerText.includes(word))) {
    score += 0.15;
  }

  // Personal markers (+0.1)
  const personalWords = ["i ", "my ", "we ", "our ", "me "];
  if (personalWords.some((word) => lowerText.includes(word))) {
    score += 0.1;
  }

  // Temporal markers (+0.1)
  const temporalWords = [
    "yesterday",
    "tomorrow",
    "next week",
    "next month",
    "deadline",
  ];
  if (temporalWords.some((word) => lowerText.includes(word))) {
    score += 0.1;
  }

  // Strong sentiment words (+0.15)
  const sentimentWords = ["love", "hate", "critical", "urgent"];
  if (sentimentWords.some((word) => lowerText.includes(word))) {
    score += 0.15;
  }

  // Cap at 1.0
  return Math.min(1.0, score);
}

/**
 * Categorize memory into episodic, semantic, or procedural
 *
 * Heuristic classification:
 * - Episodic: Contains temporal markers, past tense
 * - Procedural: Contains how-to language, steps
 * - Semantic: Everything else (facts, preferences)
 *
 * @param text Memory content
 * @returns Memory type
 */
export function categorizeMemoryType(text: string): MemoryType {
  const lowerText = text.toLowerCase();

  // Procedural indicators
  const proceduralWords = [
    "how to",
    "step 1",
    "first",
    "then",
    "next",
    "finally",
    "instructions",
  ];
  if (proceduralWords.some((word) => lowerText.includes(word))) {
    return "procedural";
  }

  // Episodic indicators
  const episodicWords = [
    "yesterday",
    "today",
    "last week",
    "last month",
    "happened",
    "went",
    "saw",
    "met",
    "talked",
    "was",
    "were",
    "did",
  ];
  if (episodicWords.some((word) => lowerText.includes(word))) {
    return "episodic";
  }

  // Default to semantic
  return "semantic";
}

/**
 * Extract potential topics/keywords from text
 *
 * Simplified extraction using word frequency.
 * For production, use LLM-based extraction.
 *
 * @param text Memory content
 * @param maxTopics Maximum number of topics to extract
 * @returns Array of topic strings
 */
export function extractTopics(text: string, maxTopics: number = 5): string[] {
  // Remove common words
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "should",
    "could",
    "can",
    "may",
    "might",
    "must",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
  ]);

  // Extract words
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  // Count frequency
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Sort by frequency and take top N
  const sorted = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTopics)
    .map(([word]) => word);

  return sorted;
}
