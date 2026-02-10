/**
 * Cognitive Memory System - Decay Calculations
 * 
 * Implements Ebbinghaus forgetting curve and spaced repetition mechanics.
 */

import type { DecayParameters, MemoryType } from './types';

/**
 * Base decay rates (in days) for different memory types
 */
export const BASE_DECAY_RATES: Record<MemoryType, number> = {
  episodic: 30,      // Events fade over ~30 days
  semantic: 90,      // Facts persist ~90 days
  procedural: Infinity  // Skills don't decay
};

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
 * @example
 * // Fresh episodic memory (stability 0.3, importance 0.5)
 * const retention = calculateRetention({
 *   stability: 0.3,
 *   importance: 0.5,
 *   lastAccessed: Date.now() - (9 * 24 * 60 * 60 * 1000), // 9 days ago
 *   memoryType: 'episodic'
 * });
 * // Returns ~0.5 (50% retention)
 * 
 * @param params Decay calculation parameters
 * @returns Retention score (0.0-1.0)
 */
export function calculateRetention(params: DecayParameters): number {
  const { stability, importance, lastAccessed, memoryType } = params;
  
  // Procedural memories never decay
  if (memoryType === 'procedural') {
    return 1.0;
  }
  
  // Calculate days since last access
  const now = Date.now();
  const daysSinceAccess = (now - lastAccessed) / (1000 * 60 * 60 * 24);
  
  // Importance boosts decay resistance (multiplier: 1.0 to 3.0)
  const importanceBoost = 1.0 + (importance * 2.0);
  
  // Get base decay rate for memory type
  const baseDecay = BASE_DECAY_RATES[memoryType];
  
  // Combined decay constant
  const decayConstant = stability * importanceBoost * baseDecay;
  
  // Prevent division by zero
  if (decayConstant < 0.1) {
    return Math.max(0, 1.0 - (daysSinceAccess / 10));
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
 * @example
 * // Memory accessed after 7 days
 * const newStability = updateStability(0.3, 7);
 * // Returns 0.4 (0.3 + 0.1 × 1.0)
 * 
 * // Memory accessed after 14 days
 * const newStability = updateStability(0.3, 14);
 * // Returns 0.5 (0.3 + 0.1 × 2.0)
 * 
 * @param currentStability Current stability level (0.0-1.0)
 * @param daysSinceLastAccess Days since this memory was last accessed
 * @returns New stability level (0.0-1.0)
 */
export function updateStability(
  currentStability: number,
  daysSinceLastAccess: number
): number {
  // Calculate spacing bonus (capped at 2x)
  // Retrieving after 7 days = 1x bonus
  // Retrieving after 14+ days = 2x bonus (max)
  const spacingBonus = Math.min(2.0, daysSinceLastAccess / 7);
  
  // Base stability increase is 0.1
  const stabilityIncrease = 0.1 * spacingBonus;
  
  // Add to current stability
  const newStability = currentStability + stabilityIncrease;
  
  // Cap at 1.0 (maximum stability)
  return Math.min(1.0, newStability);
}

/**
 * Calculate days until a memory reaches a target retention threshold
 * 
 * Useful for scheduling consolidation or determining when to surface a memory.
 * 
 * @param params Decay parameters
 * @param targetRetention Target retention level (e.g., 0.5 for 50%)
 * @returns Days until target retention is reached
 */
export function daysUntilRetention(
  params: DecayParameters,
  targetRetention: number
): number {
  const { stability, importance, memoryType } = params;
  
  // Procedural memories never decay
  if (memoryType === 'procedural') {
    return Infinity;
  }
  
  const importanceBoost = 1.0 + (importance * 2.0);
  const baseDecay = BASE_DECAY_RATES[memoryType];
  const decayConstant = stability * importanceBoost * baseDecay;
  
  // Solve for t in: targetRetention = e^(-t / decayConstant)
  // t = -decayConstant × ln(targetRetention)
  const days = -decayConstant * Math.log(targetRetention);
  
  return Math.max(0, days);
}

/**
 * Predict future retention at a specific time
 * 
 * @param params Current decay parameters
 * @param daysInFuture Number of days to predict ahead
 * @returns Predicted retention score (0.0-1.0)
 */
export function predictRetention(
  params: DecayParameters,
  daysInFuture: number
): number {
  const { stability, importance, lastAccessed, memoryType } = params;
  
  // Create params for future time
  const futureParams: DecayParameters = {
    ...params,
    lastAccessed: lastAccessed - (daysInFuture * 24 * 60 * 60 * 1000)
  };
  
  return calculateRetention(futureParams);
}

/**
 * Calculate optimal review schedule for a memory
 * 
 * Returns timestamps for when to surface this memory to maximize retention.
 * Based on spaced repetition algorithms (similar to SuperMemo/Anki).
 * 
 * @param params Current memory parameters
 * @param targetRetention Desired retention threshold (e.g., 0.8)
 * @param numReviews Number of review times to generate
 * @returns Array of timestamps for optimal reviews
 */
export function calculateReviewSchedule(
  params: DecayParameters,
  targetRetention: number = 0.8,
  numReviews: number = 5
): number[] {
  const schedule: number[] = [];
  let currentStability = params.stability;
  let currentTime = Date.now();
  
  for (let i = 0; i < numReviews; i++) {
    // Calculate days until we reach target retention
    const daysUntil = daysUntilRetention(
      { ...params, stability: currentStability },
      targetRetention
    );
    
    // Add review time
    const reviewTime = currentTime + (daysUntil * 24 * 60 * 60 * 1000);
    schedule.push(reviewTime);
    
    // Update stability for next iteration (simulate retrieval)
    currentStability = updateStability(currentStability, daysUntil);
    currentTime = reviewTime;
  }
  
  return schedule;
}
