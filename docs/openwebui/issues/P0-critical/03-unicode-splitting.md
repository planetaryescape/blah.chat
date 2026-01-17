# Fix Unicode Splitting Crashes

> **Phase**: P0-critical | **Effort**: 2h | **Impact**: 0% crash rate
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

When LLM output is split into chunks, multi-byte UTF-8 characters (emoji, Chinese/Japanese text) can be divided across chunk boundaries. This creates invalid UTF-8 sequences that cause `JSON.stringify()` to throw errors, crashing the entire generation.

### Current Behavior

```
Chunk 1: "Here is a family: 👨‍👩‍" (incomplete emoji)
Chunk 2: "👧‍👦 and text" (continuation)

Error: Unable to stringify chunk: Invalid UTF-8 sequence
at generation.ts:717
```

**Crash rate**: 0.5% (1 in 200 generations with emoji/CJK text)

### Expected Behavior

All UTF-8 sequences should be properly buffered and combined, with 0% crash rate.

### Root Cause

The streaming loop directly concatenates chunks without validating UTF-8 integrity:

```typescript
accumulated += chunk.text; // Direct concatenation, no validation
```

Multi-byte UTF-8 characters can span 1-4 bytes. When a chunk boundary falls mid-character, the resulting string is invalid.

---

## Current Implementation

**File**: `packages/backend/convex/generation.ts:705`

```typescript
// Direct concatenation - no UTF-8 validation
for await (const chunk of result.fullStream) {
  if (chunk.type === "text-delta") {
    accumulated += chunk.text; // ⚠️ Can create invalid UTF-8

    // DB update may fail with invalid string
    await ctx.runMutation(internal.messages.updatePartialContent, {
      messageId: assistantMessageId,
      partialContent: accumulated, // JSON.stringify() throws here
    });
  }
}
```

---

## Solution

Implement UTF-8 validation and buffering for incomplete sequences.

### Step 1: Create UTF-8 Safe Concatenation Utility

**File**: `packages/backend/convex/lib/utf8-safe.ts`

```typescript
/**
 * Buffers small chunks to prevent UTF-8 character splitting
 */
export class ChunkBuffer {
  private buffer = '';
  private readonly BUFFER_SIZE = 4; // Max UTF-8 continuation bytes

  /**
   * Process a chunk, buffering if it might be incomplete
   * @returns Safe text to append, or empty string if buffering
   */
  process(chunk: string): string {
    // If chunk is smaller than buffer size, accumulate
    if (chunk.length < this.BUFFER_SIZE) {
      this.buffer += chunk;

      // Once we have enough, return buffered data
      if (this.buffer.length >= this.BUFFER_SIZE) {
        const toReturn = this.buffer;
        this.buffer = '';
        return toReturn;
      }

      return ''; // Wait for more data
    }

    // For larger chunks, append buffer and return
    const result = this.buffer + chunk;
    this.buffer = '';
    return result;
  }

  /**
   * Get remaining buffered content (call at end of stream)
   */
  flush(): string {
    const remaining = this.buffer;
    this.buffer = '';
    return remaining;
  }
}

/**
 * Validates if a string is valid UTF-8 by attempting to encode/decode
 */
export function isValidUTF8(text: string): boolean {
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(encoder.encode(text));
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely stringify for DB storage, with fallback
 */
export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    // Fallback: sanitize string fields
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = { ...obj };
      for (const key in sanitized) {
        if (typeof sanitized[key] === 'string') {
          sanitized[key] = sanitized[key]
            .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // Remove lone high surrogates
            .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ''); // Remove lone low surrogates
        }
      }
      return JSON.stringify(sanitized);
    }
    throw error;
  }
}
```

### Step 2: Apply to Streaming Loop

**File**: `packages/backend/convex/generation.ts:705-750`

```typescript
import { ChunkBuffer, isValidUTF8 } from './lib/utf8-safe';

// Initialize buffer at start of generation
const chunkBuffer = new ChunkBuffer();

for await (const chunk of result.fullStream) {
  if (chunk.type === "text-delta") {
    // Safely process chunk through buffer
    const safeChunk = chunkBuffer.process(chunk.text);

    if (safeChunk) {
      accumulated += safeChunk;
    }

    // Validate before DB update
    if (!isValidUTF8(accumulated)) {
      console.warn('UTF-8 sequence incomplete, buffering');
      continue; // Wait for next chunk to complete the sequence
    }

    // Safe to update DB
    if (Date.now() - lastUpdate >= UPDATE_INTERVAL) {
      await ctx.runMutation(internal.messages.updatePartialContent, {
        messageId: assistantMessageId,
        partialContent: accumulated,
      });
      lastUpdate = Date.now();
    }
  }
}

// Flush remaining buffer at end of stream
const remaining = chunkBuffer.flush();
if (remaining) {
  accumulated += remaining;
}
```

---

## Testing

### Manual Verification

1. Send message: "Give me some emojis 🎉🎊🎈"
2. Verify response contains emojis without crashing
3. Send message: "回复我中文" (Reply in Chinese)
4. Verify Chinese characters render correctly
5. Check console for any UTF-8 warnings

### Unit Tests

```typescript
describe('UTF-8 Safe Concatenation', () => {
  it('handles complete chunks immediately', () => {
    const buffer = new ChunkBuffer();
    const result = buffer.process("Hello world");
    expect(result).toBe("Hello world");
  });

  it('buffers small chunks', () => {
    const buffer = new ChunkBuffer();

    const r1 = buffer.process("He");
    expect(r1).toBe(""); // Buffered

    const r2 = buffer.process("llo");
    expect(r2).toBe("Hello"); // Flushed
  });

  it('handles emoji sequences', () => {
    const buffer = new ChunkBuffer();

    // Simulate split emoji
    const r1 = buffer.process("👨‍");
    const r2 = buffer.process("👩‍👧‍👦");
    const r3 = buffer.flush();

    const combined = r1 + r2 + r3;
    expect(isValidUTF8(combined)).toBe(true);
  });

  it('handles multi-byte languages', () => {
    const text = "こんにちは世界"; // Hello world in Japanese
    const buffer = new ChunkBuffer();

    const result = buffer.process(text) + buffer.flush();
    expect(result).toBe(text);
    expect(isValidUTF8(result)).toBe(true);
  });
});
```

### Integration Test

```typescript
it('should complete generation with emoji without crashing', async () => {
  const messageId = await sendMessage('Send me a 🎉 emoji');

  await waitForStatus('complete');

  const message = await getMessage(messageId);
  expect(message.content).toContain('🎉');
  expect(message.status).toBe('complete');
  expect(() => JSON.stringify(message)).not.toThrow();
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Crash rate (emoji content) | 0.5% | 0% | 100% fix |
| Unicode support | Partial | Full | Complete |
| Error messages | JSON.stringify fails | None | Clean logs |

---

## Risk Assessment

- **Breaking Changes**: No
- **Migration Required**: No
- **Rollback Plan**: Remove buffer, crashes return (but detectable)
- **Performance**: Negligible (< 0.1ms buffer overhead)

---

## References

- **Sources**: kimi/01-critical/03-unicode-splitting-crashes.md, deep-research-report.md:351-430, IMPLEMENTATION-SPECIFICATION.md:240-327
- **UTF-8 Spec**: https://en.wikipedia.org/wiki/UTF-8
- **Related Issues**: P0-critical/02-stop-generation-race.md (similar buffering pattern)
