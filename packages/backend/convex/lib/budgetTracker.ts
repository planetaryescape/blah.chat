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
}

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
 * Create initial budget state for a generation.
 */
export function createBudgetState(maxTokens: number): BudgetState {
  return {
    maxTokens,
    usedTokens: 0,
    toolCallCount: 0,
    searchHistory: [],
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
 * For Phase 3: Format status for prompt injection when context is getting full.
 */
export function formatStatus(state: BudgetState): string {
  const percentUsed = getContextPercent(state);
  return `[Context: ${state.toolCallCount} tool calls, ~${percentUsed}% of context used]`;
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
    if (last3[0] > last3[1] && last3[1] > last3[2] && last3[2] < 0.5) {
      return "Search quality declining. Consider different approach or ask user.";
    }
  }

  // Check many searches without good results
  if (searchHistory.length >= 4) {
    return "Multiple searches performed. Consider answering with current info.";
  }

  return null;
}
