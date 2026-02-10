/**
 * Cognitive Memory System - Decay Calculations
 *
 * Implements Ebbinghaus forgetting curve and spaced repetition mechanics.
 */

import type { DecayParameters, MemoryType } from "./types";

/**
 * Base decay rates (in days) for different memory types
 */
export const BASE_DECAY_RATES: Record<MemoryType, number> = {
  episodic: 30, // Events fade over ~30 days
  semantic: 90, // Facts persist ~90 days
  procedural: Number.POSITIVE_INFINITY, // Skills don't decay
};

function assertUnitInterval(field: string, value: number) {
  if (Number.isNaN(value) || value < 0 || value > 1) {
    throw new Error(`Invalid ${field}: ${value} (must be [0.0, 1.0])`);
  }
}

/**
 * Calculate current retention level (0.0-1.0) for a memory
 *
 * Uses Ebbinghaus forgetting curve with importance and stability modifiers:
 * retention = e^(-t / (S × importance_boost × base_decay))
 *
 * Where:
 * - t = days since last access
 * - S = stability (0.0-1.0, grows with retrievals)
 * - importance_boost = 1 + (importance × 2)
 * - base_decay = memory type specific (30/90/∞)
 *
 * @param params Decay calculation parameters
 * @returns Retention score (0.0-1.0)
 */
export function calculateRetention(params: DecayParameters): number {
  const { stability, importance, lastAccessed, memoryType } = params;

  assertUnitInterval("stability", stability);
  assertUnitInterval("importance", importance);

  // Procedural memories never decay
  if (memoryType === "procedural") {
    return 1.0;
  }

  // Calculate days since last access
  const now = Date.now();
  const daysSinceAccess = Math.max(
    0,
    (now - lastAccessed) / (1000 * 60 * 60 * 24),
  );

  // Importance boosts decay resistance (multiplier: 1.0 to 3.0)
  const importanceBoost = 1.0 + importance * 2.0;

  // Access frequency boosts decay resistance with diminishing returns.
  const accessCountRaw =
    typeof params.accessCount === "number" &&
    Number.isFinite(params.accessCount)
      ? params.accessCount
      : 0;
  const accessCount = Math.max(0, accessCountRaw);
  const frequencyBoost = Math.min(2.0, 1.0 + Math.log1p(accessCount) * 0.1);

  // Get base decay rate for memory type
  const baseDecay = BASE_DECAY_RATES[memoryType];

  // Combined decay constant
  const decayConstant =
    stability * importanceBoost * frequencyBoost * baseDecay;

  // Prevent division by zero / degenerate cases
  if (decayConstant < 0.1) {
    return Math.max(0, 1.0 - daysSinceAccess / 10);
  }

  // Exponential decay (Ebbinghaus curve)
  const retention = Math.exp(-daysSinceAccess / decayConstant);

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, retention));
}

/**
 * Update stability after a retrieval (spaced repetition)
 *
 * Implements spaced repetition: longer gaps between retrievals
 * produce larger stability increases.
 *
 * Formula:
 * new_stability = min(1.0, old_stability + 0.1 × spacing_bonus)
 * spacing_bonus = min(2.0, days_since_last_access / 7)
 *
 * @param currentStability Current stability level (0.0-1.0)
 * @param daysSinceLastAccess Days since this memory was last accessed
 * @returns New stability level (0.0-1.0)
 */
export function updateStability(
  currentStability: number,
  daysSinceLastAccess: number,
): number {
  assertUnitInterval("stability", currentStability);

  const days = Math.max(0, daysSinceLastAccess);

  // Calculate spacing bonus (capped at 2x)
  // Retrieving after 7 days = 1x bonus
  // Retrieving after 14+ days = 2x bonus (max)
  const spacingBonus = Math.min(2.0, days / 7);

  // Base stability increase is 0.1
  const stabilityIncrease = 0.1 * spacingBonus;

  // Add to current stability
  const newStability = currentStability + stabilityIncrease;

  // Cap at 1.0 (maximum stability)
  return Math.min(1.0, newStability);
}
