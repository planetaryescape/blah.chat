/**
 * Operation tier classification for REST API patterns
 *
 * Tier 1 (< 5s): Synchronous HTTP - immediate response
 * Tier 2 (5-30s): SSE streaming with progress + polling fallback
 * Tier 3 (30s+): Jobs table + exponential backoff polling
 */

export type OperationTier = 1 | 2 | 3;

export const OPERATION_TIERS = {
  // Tier 1: Synchronous (< 5s) - Direct response
  search: 1,
  bookmarkCreate: 1,
  bookmarkDelete: 1,
  conversationList: 1,

  // Tier 2: SSE Streaming (5-30s) - Progress updates
  memoryExtract: 2,
  titleGenerate: 2,

  // Tier 3: Polling (30s+) - Long-running background jobs
  transcribe: 3,
  videoAnalyze: 3,
  embedFile: 3,
} as const;

export type Operation = keyof typeof OPERATION_TIERS;

/**
 * Get the tier for a specific operation
 */
export function getOperationTier(operation: Operation): OperationTier {
  return OPERATION_TIERS[operation];
}

/**
 * Should this operation use the jobs table?
 * Tier 2 and 3 use jobs for persistence/history
 */
export function shouldUseJobs(tier: OperationTier): boolean {
  return tier >= 2;
}

/**
 * Should this operation use SSE streaming?
 * Only Tier 2 uses SSE for real-time progress
 */
export function shouldUseSSE(tier: OperationTier): boolean {
  return tier === 2;
}

/**
 * Should this operation use polling?
 * Tier 3 uses polling (Tier 2 has polling fallback via useSSE hook)
 */
export function shouldUsePoll(tier: OperationTier): boolean {
  return tier === 3;
}
