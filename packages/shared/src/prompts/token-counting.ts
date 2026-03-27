/**
 * Simple token estimation (fallback).
 * Roughly 1 token per 4 characters for English text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
