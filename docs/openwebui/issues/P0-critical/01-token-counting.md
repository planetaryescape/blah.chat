# Fix Token Counting Accuracy

> **Phase**: P0-critical | **Effort**: 4h | **Impact**: $219K/yr savings
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

The current token counting uses a crude heuristic (`content.length / 4`) that is 40-500% inaccurate depending on content type. This causes incorrect message truncation (loses important context), context window exceeded errors, and inaccurate cost tracking.

### Current Behavior

Token estimation varies wildly based on content type:

| Content Type | Characters | Estimated | Actual | Error |
|--------------|------------|-----------|--------|-------|
| Chinese text "こんにちは世界" | 7 | 1.75 | 7 | 400% underestimate |
| Code with whitespace | 60 | 15 | 8 | 87% overestimate |
| Emoji "👨‍👩‍👧‍👦" | 11 | 2.75 | varies | 500% variance |
| Repeated patterns | 40 | 10 | 2 | 500% overestimate |

### Expected Behavior

Token counting should be 98-99.7% accurate across all content types using actual tokenizer encoding.

### Root Cause

The `length / 4` heuristic assumes English text averages ~4 characters per token. This breaks down for:
- Non-Latin scripts (each character often = 1 token)
- Whitespace-heavy code (whitespace compressed efficiently)
- Emoji sequences (variable token representation)
- Repeated patterns (BPE encodes efficiently)

---

## Current Implementation

**File**: `packages/backend/convex/messages.ts:440-485`

```typescript
// Truncation logic uses crude estimate
const estimatedTokens = systemMessage.tokens +
  messagesToTruncate.reduce((sum, m) => {
    const msgTokens = m.content.length / 4; // ⚠️ CRUDE ESTIMATE - 40-500% error
    return sum + msgTokens;
  }, 0);
```

**File**: `packages/backend/convex/generation.ts:1246-1254` (wasted cost bug)

```typescript
// Always passes 0 for outputTokens - causes $0.00 wasted cost
const wastedCost = estimateWastedCost(0, {
  input: modelConfig.pricing.input,
  output: modelConfig.pricing.output,
});
```

---

## Solution

Replace heuristic with actual token encoding using `gpt-tokenizer` library.

### Step 1: Install Tokenizer Library

```bash
bun add gpt-tokenizer
```

### Step 2: Create Token Counting Utility

**File**: `packages/backend/convex/lib/token-counter.ts`

```typescript
import { encode } from 'gpt-tokenizer';

/**
 * Counts actual tokens using GPT tokenizer
 * Falls back to heuristic only on error
 */
export function countTokens(text: string): number {
  try {
    return encode(text).length;
  } catch (error) {
    console.error('Token counting error:', error);
    return Math.ceil(text.length / 4); // Fallback only
  }
}

/**
 * Estimates tokens for multiple messages efficiently
 */
export function countTokensBatch(texts: string[]): number {
  return texts.reduce((sum, text) => sum + countTokens(text), 0);
}
```

### Step 3: Replace Token Estimations in Messages

**File**: `packages/backend/convex/messages.ts:450`

```typescript
import { countTokens } from './lib/token-counter';

// BEFORE
const msgTokens = m.content.length / 4;

// AFTER
const msgTokens = countTokens(m.content);
```

### Step 4: Fix Wasted Cost Calculation

**File**: `packages/backend/convex/generation.ts:1246-1254`

```typescript
import { countTokens } from './lib/token-counter';

// BEFORE (always passes 0 for outputTokens)
const wastedCost = estimateWastedCost(0, {
  input: modelConfig.pricing.input,
  output: modelConfig.pricing.output,
});

// AFTER (pass actual generated tokens)
const outputTokens = countTokens(accumulated);
const wastedCost = estimateWastedCost(outputTokens, {
  input: modelConfig.pricing.input,
  output: modelConfig.pricing.output,
});
```

---

## Testing

### Manual Verification

1. Send a message in Chinese: "请用中文回复我" (7 chars)
2. Check logs for token count - should be ~7, not 1.75
3. Verify no context window errors
4. Check cost tracking shows actual values, not $0.00

### Unit Tests

```typescript
import { countTokens } from './lib/token-counter';

describe('Token Counting', () => {
  it('counts English correctly', () => {
    expect(countTokens("Hello world")).toBe(2);
  });

  it('counts Chinese correctly (not length/4)', () => {
    const result = countTokens("こんにちは世界");
    expect(result).toBeGreaterThanOrEqual(5); // Not 1.75!
  });

  it('counts emoji correctly', () => {
    const result = countTokens("👨‍👩‍👧‍👦");
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('handles code with whitespace', () => {
    const code = "function test() {\n    console.log('hello');\n}";
    const result = countTokens(code);
    expect(result).toBeLessThan(20); // Not 60/4 = 15
  });
});
```

### Integration Test

```typescript
it('should track accurate cost on stopped generation', async () => {
  const messageId = await sendMessage('Write a long essay');

  // Wait for some generation
  await waitFor(() => getPartialContent(messageId).length > 100);

  // Stop generation
  await stopGeneration(messageId);

  // Verify cost is non-zero
  const message = await getMessage(messageId);
  expect(message.cost).toBeGreaterThan(0);
  expect(message.outputTokens).toBeGreaterThan(0);
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Token counting accuracy | 40-70% | 98-99.7% | +50-100% |
| Context window errors | Frequent | Rare | ~90% reduction |
| Wasted cost display | $0.00 | Accurate | Fixed |
| Annual token waste | $219K | $0 | 100% savings |

---

## Risk Assessment

- **Breaking Changes**: No - same function signature
- **Migration Required**: No - transparent improvement
- **Rollback Plan**: Revert import, heuristic still works
- **Performance**: gpt-tokenizer is fast (~0.1ms per message)

---

## References

- **Sources**: kimi/01-critical/01-token-counting-accuracy.md, deep-research-report.md:489-560, IMPLEMENTATION-SPECIFICATION.md:78-135
- **Library**: https://github.com/niieani/gpt-tokenizer
- **Related Issues**: P3-generation/01-concurrent-lock.md (token limits)
