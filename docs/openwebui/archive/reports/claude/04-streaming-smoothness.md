# Streaming Display Smoothness

> **Priority**: P1 (Important)
> **Effort**: Medium (2-4 hours)
> **Impact**: High - Significantly improves perceived streaming quality

---

## Summary

Implement delta chunking to smooth out the visual appearance of streaming text. Currently, text arrives in 50ms batches from the server, creating a slightly "chunky" appearance. By subdividing large text chunks into smaller pieces with micro-delays, the streaming will feel more natural and fluid.

---

## Current State

### Server-Side Batching

**File**: `packages/backend/convex/generation.ts`

```typescript
// Line ~604
const UPDATE_INTERVAL = 50; // 50ms batching

// Line ~733 - text accumulates, then batches
if (now - lastUpdate >= UPDATE_INTERVAL) {
  await ctx.runMutation(internal.messages.updatePartialContent, {
    messageId: assistantMessageId,
    partialContent: accumulated,
  });
  lastUpdate = now;
}
```

**Result**: Text arrives to client in ~50ms chunks, containing multiple tokens each.

### Client-Side Display

**File**: `apps/web/src/hooks/useStreamBuffer.ts`

```typescript
// Line 111-138 - RAF-based word reveal
const tick = () => {
  const wordsToRelease = Math.floor((elapsed / 1000) * wordsPerSecond);
  // Releases words at 30 words/sec
};
```

**Current behavior:**
- Server sends batches every 50ms
- Client smooths to 30 words/sec via RAF
- But transitions between batches can feel abrupt

### Visual Comparison

**Current (50ms batches):**
```
[0ms]   "Hello world, how"          <- Batch 1 (16 chars)
[50ms]  " are you doing today?"     <- Batch 2 (21 chars)
[100ms] " I hope you're"            <- Batch 3 (14 chars)
```

**With delta chunking:**
```
[0ms]   "Hel"
[5ms]   "lo "
[10ms]  "wor"
[15ms]  "ld,"
[20ms]  " ho"
[25ms]  "w "
... (smoother continuous flow)
```

---

## Problem

### Why Smooth Streaming Matters

1. **Perception of speed**: Smooth streaming feels faster than chunky batches, even at same token rate
2. **Reading flow**: Users can track text as it appears, not catch up after jumps
3. **Professional polish**: ChatGPT and Claude use similar smoothing techniques
4. **Reduced anxiety**: Continuous progress feels more reassuring than bursts

### What Open WebUI Does

```javascript
// From Open WebUI streaming/index.ts
async function* streamLargeDeltasAsRandomChunks(text) {
  for (let i = 0; i < text.length; ) {
    const chunkSize = Math.floor(Math.random() * 3) + 1; // 1-3 chars
    yield text.slice(i, i + chunkSize);
    i += chunkSize;
    await sleep(5); // 5ms between chunks
  }
}
```

They subdivide large deltas into 1-3 character chunks with 5ms delays for smoother appearance.

---

## Solution

### Option A: Enhance useStreamBuffer (Recommended)

Modify the existing buffer hook to smooth character-by-character display.

**File**: `apps/web/src/hooks/useStreamBuffer.ts`

```typescript
// New configuration
const CHARS_PER_FRAME = 2; // Characters to reveal per 16ms frame
const MIN_CHUNK_SIZE = 1;
const MAX_CHUNK_SIZE = 3;

export function useStreamBuffer({
  content,
  isStreaming,
  charsPerSecond = 120, // ~120 chars/sec = ~30 words/sec
}: UseStreamBufferProps) {
  const [displayContent, setDisplayContent] = useState("");
  const bufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);
  const lastTickRef = useRef(Date.now());

  // When new content arrives, add to buffer
  useEffect(() => {
    if (!isStreaming) {
      setDisplayContent(content);
      return;
    }

    // Calculate new characters to buffer
    const newChars = content.slice(displayContent.length);
    if (newChars) {
      bufferRef.current += newChars;
    }
  }, [content, isStreaming]);

  // RAF loop for smooth character reveal
  useEffect(() => {
    if (!isStreaming) return;

    const tick = () => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;

      // Calculate characters to release this frame
      const charsToRelease = Math.max(1, Math.floor((elapsed / 1000) * charsPerSecond));

      if (charsToRelease > 0 && bufferRef.current.length > 0) {
        // Release characters from buffer
        const chunk = bufferRef.current.slice(0, charsToRelease);
        bufferRef.current = bufferRef.current.slice(charsToRelease);

        setDisplayContent(prev => prev + chunk);
        lastTickRef.current = now;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isStreaming, charsPerSecond]);

  // Flush remaining buffer when streaming ends
  useEffect(() => {
    if (!isStreaming && bufferRef.current.length > 0) {
      setDisplayContent(prev => prev + bufferRef.current);
      bufferRef.current = "";
    }
  }, [isStreaming]);

  return displayContent;
}
```

### Option B: Reduce Server Batch Interval

**File**: `packages/backend/convex/generation.ts`

```typescript
// Change from 50ms to 16ms (~60fps)
const UPDATE_INTERVAL = 16; // Was 50

// Trade-off: More DB writes, but smoother client display
```

**Pros**: Simpler, works across all clients
**Cons**: ~3x more database mutations, higher Convex costs

### Option C: Variable Rate Based on Content

Adjust reveal speed based on content type:

```typescript
function getRevealRate(char: string): number {
  // Slow down at sentence boundaries
  if (['.', '!', '?'].includes(char)) return 50; // 50ms pause
  // Normal speed for words
  if (char === ' ') return 20; // 20ms at word boundaries
  // Fast for mid-word characters
  return 8; // 8ms default
}
```

This creates natural reading rhythm with micro-pauses at punctuation.

---

## Implementation Details

### Recommended Approach: Option A + Partial Option C

1. **Character-based buffering** (Option A) for smooth base display
2. **Punctuation pauses** (Option C) for natural rhythm
3. **Keep 50ms server batches** to avoid increased DB costs

```typescript
// Enhanced useStreamBuffer with punctuation awareness
const PUNCTUATION_PAUSE = 30; // ms pause after . ! ?
const WORD_BOUNDARY_PAUSE = 10; // ms pause after space
const BASE_CHAR_INTERVAL = 8; // ms between regular characters

function calculateDelay(char: string, nextChar: string): number {
  if (['.', '!', '?'].includes(char) && nextChar === ' ') {
    return PUNCTUATION_PAUSE;
  }
  if (char === ' ') {
    return WORD_BOUNDARY_PAUSE;
  }
  return BASE_CHAR_INTERVAL;
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/hooks/useStreamBuffer.ts` | Implement character-level smoothing |
| `apps/web/src/components/chat/MarkdownContent.tsx` | Ensure buffer is used during streaming |

---

## Testing

### Visual Testing

1. Open chat, send a message that generates a long response
2. Compare streaming smoothness before/after
3. **Before**: Text appears in visible "jumps" every 50ms
4. **After**: Text flows continuously like typing

### Performance Testing

1. Open browser DevTools → Performance tab
2. Record during streaming
3. Check for:
   - No dropped frames during streaming
   - RAF callbacks completing in < 16ms
   - No excessive memory allocation

### Edge Cases
- [ ] Very fast model (>100 tokens/sec) - buffer should not fall behind
- [ ] Very slow model (<10 tokens/sec) - should still look smooth
- [ ] Code blocks - should still work (markdown parsed after)
- [ ] Page refresh during streaming - should continue smoothly
- [ ] Multiple messages streaming - each should be independent

---

## Metrics

### Before/After Comparison

| Metric | Before | After (Target) |
|--------|--------|----------------|
| Visual chunk interval | ~50ms | ~8-16ms |
| Perceived smoothness | 6/10 | 9/10 |
| DB mutations per message | N | N (unchanged) |
| Client CPU impact | Low | Low (RAF is efficient) |

---

## References

### Open WebUI Pattern
```javascript
// Delta chunking for smoothness
async function* streamLargeDeltasAsRandomChunks(text) {
  for (let i = 0; i < text.length; ) {
    const chunkSize = Math.floor(Math.random() * 3) + 1;
    yield text.slice(i, i + chunkSize);
    i += chunkSize;
    await sleep(5);
  }
}
```

### Research Findings
> "For streaming text, revealing 1-3 characters with 5-10ms delays creates the smoothest perceived animation while remaining responsive."

### Chrome Developer Recommendations
> "Use requestAnimationFrame for smooth animations. Batch DOM updates and use CSS transforms for performance."

---

## Notes

- **Don't reduce server batch interval** unless client-side smoothing isn't sufficient
- **Character-level** smoothing is better than word-level for perceived fluidity
- **Punctuation awareness** is a nice-to-have, not required for MVP
- Test with `prefers-reduced-motion` - should show instant text instead
