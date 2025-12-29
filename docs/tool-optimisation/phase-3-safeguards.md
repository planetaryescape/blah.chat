# Phase 3: Tool Call Safeguards

**Timeline**: Week 3
**Issues**: 7, 8, 9, 10
**Dependencies**: Phase 1 Issue 3 (Budget Tracker) required; Phase 2 Issues 5, 6 recommended
**Enables**: Robust production deployment with cost control

---

## Context

### Prerequisites
Required:
- [x] Issue 3: `BudgetTracker` class created (Phase 1)

Recommended (for Issue 10):
- [x] Issue 5: Quality scoring (Phase 2)
- [x] Issue 6: Diminishing returns detection (Phase 2)

### Current State
After Phase 1 & 2:
- Token budget tracked per generation
- Search quality assessed with objective metrics
- Diminishing returns detected and warned

### Remaining Problems
1. No limits on individual tool calls - `urlReader` could be called 10 times
2. AI doesn't see budget status - can't make informed decisions
3. Tool results bloat context - no summarization
4. Agent keeps searching instead of asking user when stuck

### Configuration Decisions (from planning)
- **Budget injection threshold**: 50% (inject when half budget used)
- **Ask user threshold**: 30% remaining (suggest clarification when low)
- **Rate limits**: `{ searchAll: 5/min, urlReader: 3/min, codeExecution: 2/min }`
- **Summarization model**: gpt-4o-mini

### Key Files
| File | Purpose |
|------|---------|
| `packages/backend/convex/lib/budgetTracker.ts` | Token budget tracking |
| `packages/backend/convex/generation.ts` | Main generation loop |
| `packages/backend/convex/generation/tools.ts` | Tool registration |

---

## Issues in This Phase

### Issue 7: Per-Tool Rate Limiting

**Priority**: P1
**Effort**: 2-3 hours
**Dependencies**: None (independent)

#### Problem
No limits on individual tool calls. A tool like `urlReader` could be called excessively, wasting tokens and time.

#### Implementation

**Step 1**: Create `convex/lib/toolRateLimiter.ts`

```typescript
/**
 * Per-tool rate limiting for AI generations.
 * Uses sliding window algorithm within a single generation.
 */

interface RateLimitConfig {
  maxCalls: number;
  windowMs: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  searchAll: { maxCalls: 5, windowMs: 60000 },
  searchFiles: { maxCalls: 5, windowMs: 60000 },
  searchNotes: { maxCalls: 5, windowMs: 60000 },
  searchTasks: { maxCalls: 5, windowMs: 60000 },
  searchKnowledgeBank: { maxCalls: 5, windowMs: 60000 },
  queryHistory: { maxCalls: 5, windowMs: 60000 },
  urlReader: { maxCalls: 3, windowMs: 60000 },
  codeExecution: { maxCalls: 2, windowMs: 60000 },
  calculator: { maxCalls: 10, windowMs: 60000 },
  datetime: { maxCalls: 5, windowMs: 60000 },
  weather: { maxCalls: 3, windowMs: 60000 },
};

interface ToolCallRecord {
  timestamp: number;
}

export interface RateLimitResult {
  allowed: boolean;
  waitMs?: number;
  message?: string;
  currentCount: number;
  maxCount: number;
}

export class ToolRateLimiter {
  private callHistory: Map<string, ToolCallRecord[]> = new Map();
  private limits: Record<string, RateLimitConfig>;

  constructor(customLimits?: Partial<Record<string, RateLimitConfig>>) {
    this.limits = { ...DEFAULT_LIMITS, ...customLimits };
  }

  /**
   * Check if a tool call is allowed
   */
  checkLimit(toolName: string): RateLimitResult {
    const config = this.limits[toolName] ?? { maxCalls: 5, windowMs: 60000 };
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get call history for this tool
    const history = this.callHistory.get(toolName) ?? [];

    // Filter to calls within window
    const recentCalls = history.filter(call => call.timestamp > windowStart);

    if (recentCalls.length >= config.maxCalls) {
      // Calculate wait time
      const oldestCall = recentCalls[0];
      const waitMs = oldestCall.timestamp + config.windowMs - now;

      return {
        allowed: false,
        waitMs,
        message: `Rate limit reached for ${toolName}. You've used it ${recentCalls.length} times in the last minute. Try a different approach or wait.`,
        currentCount: recentCalls.length,
        maxCount: config.maxCalls,
      };
    }

    return {
      allowed: true,
      currentCount: recentCalls.length,
      maxCount: config.maxCalls,
    };
  }

  /**
   * Record a tool call
   */
  recordCall(toolName: string): void {
    const history = this.callHistory.get(toolName) ?? [];
    history.push({ timestamp: Date.now() });
    this.callHistory.set(toolName, history);
  }

  /**
   * Get usage summary for all tools
   */
  getUsageSummary(): Record<string, { used: number; max: number }> {
    const now = Date.now();
    const summary: Record<string, { used: number; max: number }> = {};

    for (const [toolName, config] of Object.entries(this.limits)) {
      const history = this.callHistory.get(toolName) ?? [];
      const windowStart = now - config.windowMs;
      const recentCalls = history.filter(call => call.timestamp > windowStart);

      summary[toolName] = {
        used: recentCalls.length,
        max: config.maxCalls,
      };
    }

    return summary;
  }

  /**
   * Clear history (call at end of generation)
   */
  clear(): void {
    this.callHistory.clear();
  }
}
```

**Step 2**: Integrate into generation.ts

```typescript
// At top of generation action
import { ToolRateLimiter } from "./lib/toolRateLimiter";

// Initialize per generation
const rateLimiter = new ToolRateLimiter();

// Before tool execution (in streaming loop or tool wrapper)
// This requires wrapping tool execution
```

**Step 3**: Create tool wrapper with rate limiting

```typescript
// In generation/tools.ts, wrap each tool

function wrapToolWithRateLimit<T>(
  tool: CoreTool<T>,
  toolName: string,
  rateLimiter: ToolRateLimiter,
  onRateLimited: (message: string) => void
): CoreTool<T> {
  const originalExecute = tool.execute;

  return {
    ...tool,
    execute: async (...args) => {
      const limitResult = rateLimiter.checkLimit(toolName);

      if (!limitResult.allowed) {
        onRateLimited(limitResult.message!);
        // Return error result instead of executing
        return {
          success: false,
          error: limitResult.message,
          rateLimited: true,
        };
      }

      rateLimiter.recordCall(toolName);
      return originalExecute(...args);
    },
  };
}
```

**Step 4**: Apply wrapper in buildTools

```typescript
export function buildTools(config: BuildToolsConfig & {
  rateLimiter?: ToolRateLimiter;
  onRateLimited?: (message: string) => void;
}) {
  const tools: Record<string, unknown> = {};
  const { rateLimiter, onRateLimited } = config;

  // Build tools as before...
  tools.searchAll = createSearchAllTool(ctx, userId, conversationId);

  // Wrap with rate limiting if limiter provided
  if (rateLimiter && onRateLimited) {
    for (const [name, tool] of Object.entries(tools)) {
      tools[name] = wrapToolWithRateLimit(tool, name, rateLimiter, onRateLimited);
    }
  }

  return tools;
}
```

#### Files to Create/Modify
- `packages/backend/convex/lib/toolRateLimiter.ts` (new)
- `packages/backend/convex/generation.ts`
- `packages/backend/convex/generation/tools.ts`

#### Acceptance Criteria
- [ ] Rate limits enforced per tool
- [ ] Graceful handling (returns error, doesn't throw)
- [ ] Message injected when rate limited
- [ ] Limits configurable per tool

#### Unit Tests
```typescript
describe("ToolRateLimiter", () => {
  it("allows calls within limit", () => {
    const limiter = new ToolRateLimiter();
    const result = limiter.checkLimit("searchAll");
    expect(result.allowed).toBe(true);
  });

  it("blocks calls exceeding limit", () => {
    const limiter = new ToolRateLimiter({ test: { maxCalls: 2, windowMs: 60000 } });
    limiter.recordCall("test");
    limiter.recordCall("test");
    const result = limiter.checkLimit("test");
    expect(result.allowed).toBe(false);
  });

  it("allows calls after window expires", async () => {
    const limiter = new ToolRateLimiter({ test: { maxCalls: 1, windowMs: 100 } });
    limiter.recordCall("test");
    await new Promise(r => setTimeout(r, 150));
    const result = limiter.checkLimit("test");
    expect(result.allowed).toBe(true);
  });
});
```

---

### Issue 8: Token Budget Awareness in System Prompt

**Priority**: P0 (Critical)
**Effort**: 2 hours
**Dependencies**: Issue 3 (Budget Tracker)

#### Problem
AI has no visibility into remaining budget. Google's Budget Tracker research shows injecting budget status helps prevent runaway spending.

#### Implementation

**Step 1**: Add budget status injection in generation.ts

```typescript
// After each tool result is processed, check if we should inject budget status
function shouldInjectBudgetStatus(budgetTracker: BudgetTracker): boolean {
  return budgetTracker.isLow(); // Returns true when >= 50% used
}

// In the streaming/tool handling loop
if (chunk.type === "tool-result") {
  // ... process result ...

  // Check if we should inject budget status
  if (shouldInjectBudgetStatus(budgetTracker)) {
    pendingBudgetInjection = budgetTracker.formatStatus();
  }
}

// Before next AI call (if doing multi-step)
if (pendingBudgetInjection) {
  allMessages.push({
    role: "system",
    content: pendingBudgetInjection,
  });
  pendingBudgetInjection = null;
}
```

**Step 2**: Enhance formatStatus in budgetTracker.ts

```typescript
// Already created in Phase 1, enhance if needed
formatStatus(): string {
  const state = this.getState();

  // More detailed status when budget is critical
  if (state.percentUsed >= 70) {
    return `[System: Budget Critical]
- Tools used: ${state.toolCallCount}/${state.maxToolCalls}
- Estimated tokens used: ~${Math.round(state.usedTokens).toLocaleString()}
- Remaining capacity: ~${Math.round(100 - state.percentUsed)}%

RECOMMENDATION: You should answer now with the information you have, or ask the user for clarification. Continuing to search may exhaust the context window.`;
  }

  return `[System: Budget Status]
- Tools used: ${state.toolCallCount}/${state.maxToolCalls}
- Tokens used: ~${Math.round(state.usedTokens).toLocaleString()}
- Remaining capacity: ~${Math.round(100 - state.percentUsed)}%
- Suggestion: ${this.getRecommendation()}`;
}
```

**Step 3**: Make injection configurable (optional)

```typescript
// In user settings or generation args
interface GenerationConfig {
  enableBudgetInjection?: boolean; // default true
  budgetInjectionThreshold?: number; // default 50
}

// Use in shouldInjectBudgetStatus
function shouldInjectBudgetStatus(
  budgetTracker: BudgetTracker,
  config: GenerationConfig
): boolean {
  if (config.enableBudgetInjection === false) return false;
  const threshold = config.budgetInjectionThreshold ?? 50;
  return budgetTracker.getState().percentUsed >= threshold;
}
```

#### Files to Modify
- `packages/backend/convex/generation.ts`
- `packages/backend/convex/lib/budgetTracker.ts`

#### Acceptance Criteria
- [ ] Budget status injected after tool calls when >= 50% used
- [ ] Status message is clear and actionable
- [ ] AI demonstrably considers budget in reasoning (verify in logs)
- [ ] Injection can be disabled via config

#### Manual Testing
```
1. Send a query that triggers multiple tool calls
2. Verify budget status appears in message history after ~3 tool calls
3. Verify AI mentions budget/tokens in its reasoning
4. Verify AI stops or asks user when budget critical
```

---

### Issue 9: Context Budget Management

**Priority**: P1
**Effort**: 3-4 hours
**Dependencies**: Issue 3 (Budget Tracker)

#### Problem
Tool results can bloat context without limit. Long tool results fill the context window, leaving no room for response.

#### Implementation

**Step 1**: Add context size tracking to BudgetTracker

```typescript
// In budgetTracker.ts, add context tracking

export class BudgetTracker {
  private contextTokens: number = 0;
  private maxContextTokens: number;

  constructor(maxTokens: number, maxToolCalls: number = 5) {
    this.maxTokens = maxTokens;
    this.maxContextTokens = maxTokens * 0.8; // Leave 20% for response
    this.maxToolCalls = maxToolCalls;
  }

  recordContextGrowth(tokens: number): void {
    this.contextTokens += tokens;
  }

  getContextState(): { used: number; max: number; percent: number } {
    return {
      used: this.contextTokens,
      max: this.maxContextTokens,
      percent: (this.contextTokens / this.maxContextTokens) * 100,
    };
  }

  isContextNearLimit(): boolean {
    return this.getContextState().percent >= 80;
  }
}
```

**Step 2**: Create summarization helper

```typescript
// In convex/lib/utils/summarize.ts

import { generateText } from "ai";

const SUMMARIZE_MODEL = "openai:gpt-4o-mini";

export async function summarizeToolResults(
  results: Array<{ toolName: string; result: any; timestamp: number }>,
  keepRecent: number = 2
): Promise<string> {
  // Keep last N results in full
  const recent = results.slice(-keepRecent);
  const toSummarize = results.slice(0, -keepRecent);

  if (toSummarize.length === 0) {
    return ""; // Nothing to summarize
  }

  const summaryPrompt = `Summarize these tool call results concisely. Focus on key information that would help answer a user's question.

${toSummarize.map(r => `[${r.toolName}]: ${JSON.stringify(r.result).slice(0, 1000)}`).join("\n\n")}

Provide a brief summary (max 200 words):`;

  try {
    const { text } = await generateText({
      model: SUMMARIZE_MODEL,
      prompt: summaryPrompt,
      maxTokens: 300,
    });
    return text;
  } catch (error) {
    // Fallback: just truncate
    return toSummarize
      .map(r => `[${r.toolName}]: ${JSON.stringify(r.result).slice(0, 200)}...`)
      .join("\n");
  }
}

export function truncateResult(result: any, maxChars: number = 500): any {
  const str = JSON.stringify(result);
  if (str.length <= maxChars) return result;

  // Try to preserve structure
  if (Array.isArray(result)) {
    return result.slice(0, 3).map(item => truncateResult(item, maxChars / 3));
  }

  if (typeof result === "object" && result !== null) {
    const truncated: Record<string, any> = {};
    for (const [key, value] of Object.entries(result)) {
      truncated[key] = truncateResult(value, maxChars / Object.keys(result).length);
    }
    return truncated;
  }

  if (typeof result === "string") {
    return result.slice(0, maxChars) + "... [truncated]";
  }

  return result;
}
```

**Step 3**: Apply context management in generation.ts

```typescript
// Track tool results
const toolResultHistory: Array<{ toolName: string; result: any; timestamp: number }> = [];

// After each tool result
if (chunk.type === "tool-result") {
  const result = chunk.result ?? chunk.output;
  const resultTokens = JSON.stringify(result).length / 4;

  budgetTracker.recordContextGrowth(resultTokens);
  toolResultHistory.push({
    toolName: chunk.toolName,
    result,
    timestamp: Date.now(),
  });

  // Check if context is getting too large
  if (budgetTracker.isContextNearLimit() && toolResultHistory.length > 2) {
    // Summarize old results
    const summary = await summarizeToolResults(toolResultHistory, 2);

    // Replace old tool results in message history with summary
    const summaryMessage = {
      role: "system",
      content: `[Previous Tool Results Summary]\n${summary}`,
    };

    // Update message history to use summary instead of full results
    // (Implementation depends on message structure)
  }
}
```

#### Files to Create/Modify
- `packages/backend/convex/lib/budgetTracker.ts`
- `packages/backend/convex/lib/utils/summarize.ts` (new)
- `packages/backend/convex/generation.ts`

#### Acceptance Criteria
- [ ] Context size tracked in budget tracker
- [ ] Old tool results summarized when context >= 80%
- [ ] Most recent 2 results kept in full
- [ ] Summarization uses gpt-4o-mini
- [ ] No context overflow errors

#### Unit Tests
```typescript
describe("summarizeToolResults", () => {
  it("keeps recent results unchanged", async () => {
    const results = [
      { toolName: "search", result: { data: "a" }, timestamp: 1 },
      { toolName: "search", result: { data: "b" }, timestamp: 2 },
    ];
    const summary = await summarizeToolResults(results, 2);
    expect(summary).toBe(""); // Nothing to summarize
  });
});

describe("truncateResult", () => {
  it("truncates long strings", () => {
    const result = "a".repeat(1000);
    const truncated = truncateResult(result, 100);
    expect(truncated.length).toBeLessThan(150);
    expect(truncated).toContain("[truncated]");
  });
});
```

---

### Issue 10: "Ask User" Heuristic

**Priority**: P2
**Effort**: 3 hours
**Dependencies**: Issues 6 (Diminishing Returns), 8 (Budget Awareness)

#### Problem
Agent keeps searching instead of asking user for clarification when stuck. This wastes budget and frustrates users.

#### Implementation

**Step 1**: Create askForClarification tool

```typescript
// In convex/ai/tools/askForClarification.ts

import { tool } from "ai";
import { z } from "zod";

export function createAskForClarificationTool(
  ctx: ActionCtx,
  onAskUser: (question: string, context: string) => void
) {
  return tool({
    description: `Ask the user for clarification when:
- You've searched multiple times without finding relevant information
- The query is ambiguous and could mean different things
- You need specific details to provide a good answer
- Budget is running low and you're not confident in current results

Use this instead of continuing to search when you're stuck.`,
    inputSchema: z.object({
      question: z.string().describe("The clarifying question to ask the user"),
      context: z.string().describe("Brief explanation of what you've found so far and why you need clarification"),
    }),
    execute: async ({ question, context }) => {
      onAskUser(question, context);

      return {
        success: true,
        message: "Clarification requested from user. Wait for their response before continuing.",
        pauseGeneration: true,
      };
    },
  });
}
```

**Step 2**: Create stuck detection logic

```typescript
// In generation/tools.ts or new file

interface StuckDetectorState {
  searchCount: number;
  lastHighQualityResult: number | null;
  topicSearches: Map<string, number>; // topic -> count
}

export function detectStuckPattern(
  state: StuckDetectorState,
  budgetTracker: BudgetTracker,
  latestSearchQuality: QualityLevel
): { isStuck: boolean; reason?: string } {
  // Pattern 1: Many searches with no high-quality results
  if (state.searchCount >= 3 && state.lastHighQualityResult === null) {
    return {
      isStuck: true,
      reason: "Multiple searches performed without finding high-quality results",
    };
  }

  // Pattern 2: Budget critical
  if (budgetTracker.shouldAskUser()) {
    return {
      isStuck: true,
      reason: "Budget running low and results uncertain",
    };
  }

  // Pattern 3: Same topic searched multiple ways
  for (const [topic, count] of state.topicSearches) {
    if (count >= 3) {
      return {
        isStuck: true,
        reason: `Searched for "${topic}" multiple times with different queries`,
      };
    }
  }

  return { isStuck: false };
}

// Extract topic from query (simple version)
function extractTopic(query: string): string {
  // Remove common words, return core topic
  const stopWords = new Set(["the", "a", "an", "is", "are", "what", "how", "where", "when", "why"]);
  const words = query.toLowerCase().split(/\s+/).filter(w => !stopWords.has(w));
  return words.slice(0, 3).join(" ");
}
```

**Step 3**: Inject stuck suggestion

```typescript
// In generation.ts, after search tool result

if (chunk.type === "tool-result" && chunk.toolName.includes("search")) {
  const quality = result.quality?.level ?? "low";

  // Update stuck detector state
  stuckState.searchCount++;
  if (quality === "high") {
    stuckState.lastHighQualityResult = Date.now();
  }

  const topic = extractTopic(toolCall.args?.query ?? "");
  stuckState.topicSearches.set(topic, (stuckState.topicSearches.get(topic) ?? 0) + 1);

  // Check if stuck
  const stuckResult = detectStuckPattern(stuckState, budgetTracker, quality);

  if (stuckResult.isStuck) {
    pendingMessages.push({
      role: "system",
      content: `[System: Consider Asking User]
${stuckResult.reason}

Instead of searching again, consider using the askForClarification tool to ask the user:
- What specific information they're looking for
- If they can provide more context
- Which aspect is most important to them`,
    });
  }
}
```

**Step 4**: Handle clarification in UI

```typescript
// This requires frontend work - the tool returns pauseGeneration: true
// Frontend should detect this and show the clarification UI

// In message rendering:
if (toolCall.name === "askForClarification" && toolCall.result?.pauseGeneration) {
  // Show clarification prompt to user
  // Wait for user response
  // Continue generation with user's answer
}
```

#### Files to Create/Modify
- `packages/backend/convex/ai/tools/askForClarification.ts` (new)
- `packages/backend/convex/generation.ts`
- `packages/backend/convex/generation/tools.ts`
- Frontend: clarification UI component (separate task)

#### Acceptance Criteria
- [ ] Stuck patterns detected (3+ low-quality searches, budget low, repeated topics)
- [ ] Suggestion injected to use askForClarification tool
- [ ] Tool created and registered
- [ ] Tool returns pauseGeneration signal
- [ ] Frontend handles clarification (may be separate task)

#### Unit Tests
```typescript
describe("detectStuckPattern", () => {
  it("detects stuck after many low-quality searches", () => {
    const state = { searchCount: 4, lastHighQualityResult: null, topicSearches: new Map() };
    const result = detectStuckPattern(state, mockBudgetTracker, "low");
    expect(result.isStuck).toBe(true);
  });

  it("not stuck when high-quality results found", () => {
    const state = { searchCount: 4, lastHighQualityResult: Date.now(), topicSearches: new Map() };
    const result = detectStuckPattern(state, mockBudgetTracker, "high");
    expect(result.isStuck).toBe(false);
  });
});
```

---

## What Comes Before

Required from Phase 1:
- Issue 3: Budget tracker (used by Issues 8, 9, 10)

Recommended from Phase 2:
- Issue 5: Quality scoring (used by Issue 10)
- Issue 6: Diminishing returns (complements Issue 10)

---

## What Comes Next

Phase 4 (Advanced) - Optional:
- **Issue 13**: Query Expansion

With Phase 3 complete, the system has:
- Cost controls (rate limiting, budget awareness)
- Context management (summarization)
- User interaction when stuck

This enables safe production deployment with predictable costs.

---

## Testing Strategy

Unit tests:
- Rate limiter window logic
- Budget injection thresholds
- Summarization truncation
- Stuck detection patterns

Integration testing recommended:
- End-to-end flow with rate limits
- Budget injection appearing in AI reasoning
- Context not exceeding limits

Manual QA:
- Verify AI respects rate limits gracefully
- Verify budget warnings affect AI behavior
- Verify stuck detection triggers ask-user suggestion
