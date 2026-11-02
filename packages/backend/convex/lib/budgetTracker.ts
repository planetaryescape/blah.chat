/**
 * Budget Tracker - AWARENESS tracking for tool calls during generation.
 *
 * Purpose:
 * 1. Track context consumption (for Phase 3 budget injection into prompts)
 * 2. Detect runaway patterns (repeated queries, not raw counts)
 * 3. Provide visibility to downstream phases
 *
 * NOTE: This does NOT block tool calls. Existing step limit logic handles step limits.
 * This module provides awareness functions for future Phase 3 prompt injection.
 */

/**
 * Budget state tracked during a generation.
 */
export interface BudgetState {
  maxTokens: number;
  usedTokens: number;
  toolCallCount: number;
  searchHistory: Array<{
    query: string;
    resultCount: number;
    topScore: number;
  }>;
  /** Per-tool call counts for rate limiting (Phase 3) */
  toolCallCounts: Record<string, number>;
}

/**
 * Search quality thresholds for diminishing returns detection.
 */
const LOW_QUALITY_THRESHOLD = 0.5;
const MAX_SEARCH_ATTEMPTS = 4;

/**
 * Threshold for "low quality" search results (used for stuck detection).
 */
export const LOW_QUALITY_SCORE_THRESHOLD = 0.7;

/**
 * Truncation constants for context management.
 */
const MAX_TRUNCATED_ARRAY_ITEMS = 3;
export const MIN_TOOL_CALLS_FOR_TRUNCATION = 2;

/**
 * Per-tool rate limits (max calls per generation).
 * Prevents tool abuse while allowing reasonable usage.
 */
const TOOL_RATE_LIMITS: Record<string, number> = {
  searchAll: 5,
  searchFiles: 5,
  searchNotes: 5,
  searchTasks: 5,
  searchKnowledgeBank: 5,
  queryHistory: 5,
  urlReader: 3,
  codeExecution: 2,
  weather: 3,
  default: 10,
};

/**
 * Tool token estimates (chars/4 approximation) - for context tracking only.
 * These are rough estimates based on typical tool result sizes.
 */
const TOOL_TOKEN_ESTIMATES: Record<string, number> = {
  searchAll: 800,
  searchFiles: 400,
  searchNotes: 300,
  searchTasks: 300,
  searchKnowledgeBank: 500,
  queryHistory: 400,
  urlReader: 1500,
  codeExecution: 600,
  calculator: 100,
  datetime: 50,
  weather: 200,
  default: 300,
};

/**
 * Tool execution timeout constants (ms).
 * Prevents stuck tool calls from blocking generation.
 */
export const TOOL_TIMEOUTS: Record<string, number> = {
  searchAll: 30000, // 30s - multiple parallel searches
  searchFiles: 15000,
  searchNotes: 15000,
  searchTasks: 15000,
  searchKnowledgeBank: 15000,
  queryHistory: 15000,
  urlReader: 120000, // 2min - external fetch can be slow
  codeExecution: 120000, // 2min - code execution can take time
  youtubeVideo: 300000, // 5min - video processing is slow
  weather: 60000, // 1min - external API
  calculator: 5000,
  datetime: 1000,
  default: 30000,
};

/**
 * LLM call timeout for operational tasks (reranking, expansion).
 */
export const LLM_OPERATION_TIMEOUT = 15000; // 15s

/**
 * Custom error for timeout handling.
 */
export class TimeoutError extends Error {
  constructor(
    public readonly operation: string,
    public readonly timeoutMs: number,
  ) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Wrap a promise with a wall-clock timeout.
 * Throws TimeoutError if the promise doesn't resolve in time.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Get timeout for a specific tool.
 */
export function getToolTimeout(toolName: string): number {
  return TOOL_TIMEOUTS[toolName] ?? TOOL_TIMEOUTS.default;
}

/**
 * Create initial budget state for a generation.
 */
export function createBudgetState(maxTokens: number): BudgetState {
  return {
    maxTokens,
    usedTokens: 0,
    toolCallCount: 0,
    searchHistory: [],
    toolCallCounts: {},
  };
}

/**
 * Get estimated token cost for a tool (before execution).
 */
export function estimateToolCost(toolName: string): number {
  return TOOL_TOKEN_ESTIMATES[toolName] ?? TOOL_TOKEN_ESTIMATES.default;
}

/**
 * Record token usage after a tool result.
 * Returns new state (immutable pattern).
 */
export function recordUsage(state: BudgetState, tokens: number): BudgetState {
  return {
    ...state,
    usedTokens: state.usedTokens + tokens,
    toolCallCount: state.toolCallCount + 1,
  };
}

/**
 * Record a search for pattern detection.
 * Returns new state (immutable pattern).
 */
export function recordSearch(
  state: BudgetState,
  query: string,
  resultCount: number,
  topScore: number,
): BudgetState {
  return {
    ...state,
    searchHistory: [...state.searchHistory, { query, resultCount, topScore }],
  };
}

/**
 * Check if a tool has hit its rate limit.
 * Returns limited: true with message if limit exceeded.
 */
export function isToolRateLimited(
  state: BudgetState,
  toolName: string,
): { limited: boolean; message?: string } {
  const limit = TOOL_RATE_LIMITS[toolName] ?? TOOL_RATE_LIMITS.default;
  const count = state.toolCallCounts[toolName] ?? 0;
  if (count >= limit) {
    return {
      limited: true,
      message: `${toolName} limit reached (${count}/${limit}). Try a different approach.`,
    };
  }
  return { limited: false };
}

/**
 * Record a tool call for rate limiting.
 * Returns new state (immutable pattern).
 */
export function recordToolCall(
  state: BudgetState,
  toolName: string,
): BudgetState {
  return {
    ...state,
    toolCallCounts: {
      ...state.toolCallCounts,
      [toolName]: (state.toolCallCounts[toolName] ?? 0) + 1,
    },
  };
}

/**
 * For Phase 3: Detect if SAME query was already searched (runaway pattern).
 */
export function isRepeatedQuery(state: BudgetState, query: string): boolean {
  const normalized = query.toLowerCase().trim();
  return state.searchHistory.some(
    (h) => h.query.toLowerCase().trim() === normalized,
  );
}

/**
 * For Phase 3: Get context consumption percentage (informational).
 */
export function getContextPercent(state: BudgetState): number {
  if (state.maxTokens === 0) return 0;
  return Math.round((state.usedTokens / state.maxTokens) * 100);
}

/**
 * Format status for prompt injection when context is getting full.
 * Tiered messaging based on usage level.
 */
export function formatStatus(state: BudgetState): string {
  const percentUsed = getContextPercent(state);
  const toolCount = state.toolCallCount;

  if (percentUsed >= 70) {
    return `[Budget Critical: ~${percentUsed}% context, ${toolCount} tools]
Answer now with current info or ask user for clarification.`;
  }

  if (percentUsed >= 50) {
    return `[Budget: ~${percentUsed}% context, ${toolCount} tools]
Prioritize essential searches only.`;
  }

  return `[Context: ${toolCount} tool calls, ~${percentUsed}% of context used]`;
}

/**
 * For Phase 3: Check if context is getting full (>50% used).
 * This is informational only - used for prompt injection, not blocking.
 */
export function isContextGettingFull(state: BudgetState): boolean {
  return getContextPercent(state) >= 50;
}

/**
 * For Phase 3: Get search pattern analysis.
 * Returns info about search patterns for diminishing returns detection.
 */
export function getSearchPatternInfo(state: BudgetState): {
  totalSearches: number;
  avgResultCount: number;
  avgTopScore: number;
  hasRepeatedQueries: boolean;
} {
  if (state.searchHistory.length === 0) {
    return {
      totalSearches: 0,
      avgResultCount: 0,
      avgTopScore: 0,
      hasRepeatedQueries: false,
    };
  }

  const totalResults = state.searchHistory.reduce(
    (sum, h) => sum + h.resultCount,
    0,
  );
  const totalScore = state.searchHistory.reduce(
    (sum, h) => sum + h.topScore,
    0,
  );

  // Check for repeated queries
  const normalizedQueries = state.searchHistory.map((h) =>
    h.query.toLowerCase().trim(),
  );
  const uniqueQueries = new Set(normalizedQueries);
  const hasRepeatedQueries = uniqueQueries.size < normalizedQueries.length;

  return {
    totalSearches: state.searchHistory.length,
    avgResultCount: totalResults / state.searchHistory.length,
    avgTopScore: totalScore / state.searchHistory.length,
    hasRepeatedQueries,
  };
}

/**
 * Format warning for diminishing returns patterns.
 * Returns null if no concerning patterns detected.
 */
export function formatSearchWarning(state: BudgetState): string | null {
  const { searchHistory } = state;
  if (searchHistory.length === 0) return null;

  const latest = searchHistory[searchHistory.length - 1];

  // Check repeated query
  const isDuplicate = searchHistory
    .slice(0, -1)
    .some(
      (h) => h.query.toLowerCase().trim() === latest.query.toLowerCase().trim(),
    );
  if (isDuplicate) {
    return `Already searched "${latest.query}". Try different terms or answer with current info.`;
  }

  // Check decreasing quality (3+ searches)
  if (searchHistory.length >= 3) {
    const last3 = searchHistory.slice(-3).map((h) => h.topScore);
    if (
      last3[0] > last3[1] &&
      last3[1] > last3[2] &&
      last3[2] < LOW_QUALITY_THRESHOLD
    ) {
      return "Search quality declining. Consider different approach or ask user.";
    }
  }

  // Check many searches without good results
  if (searchHistory.length >= MAX_SEARCH_ATTEMPTS) {
    return "Multiple searches performed. Consider answering with current info.";
  }

  return null;
}

/**
 * Truncate tool result for context management.
 * Preserves structure where possible.
 */
export function truncateToolResult(
  result: unknown,
  maxChars: number = 500,
): unknown {
  const str = JSON.stringify(result);
  if (str.length <= maxChars) return result;

  // Preserve structure for arrays - keep first N items
  if (Array.isArray(result)) {
    return result
      .slice(0, MAX_TRUNCATED_ARRAY_ITEMS)
      .map((item) =>
        truncateToolResult(
          item,
          Math.floor(maxChars / MAX_TRUNCATED_ARRAY_ITEMS),
        ),
      );
  }

  // Truncate string content
  if (typeof result === "string") {
    return `${result.slice(0, maxChars)}... [truncated]`;
  }

  // For objects, truncate string values
  if (typeof result === "object" && result !== null) {
    const truncated: Record<string, unknown> = {};
    const keys = Object.keys(result);
    // Guard against division by zero for empty objects
    if (keys.length === 0) return result;
    const charPerKey = Math.floor(maxChars / keys.length);
    for (const key of keys) {
      truncated[key] = truncateToolResult(
        (result as Record<string, unknown>)[key],
        charPerKey,
      );
    }
    return truncated;
  }

  return result;
}

/**
 * Check if AI should suggest asking user for clarification.
 * Returns true when stuck patterns detected.
 */
export function shouldSuggestAskUser(state: BudgetState): boolean {
  const { searchHistory } = state;

  // 3+ searches with all low quality results
  if (searchHistory.length >= 3) {
    const recentScores = searchHistory.slice(-3).map((h) => h.topScore);
    if (recentScores.every((s) => s < LOW_QUALITY_SCORE_THRESHOLD)) return true;
  }

  // Budget critical
  if (getContextPercent(state) >= 70) return true;

  return false;
}
