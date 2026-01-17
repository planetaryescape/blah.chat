# Streaming Display Smoothness

> **Phase**: P4-streaming | **Effort**: 4h | **Impact**: Professional polish
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

Text arrives from the server in 50ms batches, creating a visibly "chunky" appearance during streaming. This creates a sense of choppiness compared to ChatGPT and Claude, which use delta chunking for smooth character-by-character reveal. Users perceive chunky streaming as slower, even at the same token rate.

### Current Behavior

```
[0ms]   "Hello world, how"          <- Batch 1 (16 chars)
[50ms]  " are you doing today?"     <- Batch 2 (21 chars)
[100ms] " I hope you're"            <- Batch 3 (14 chars)
```

Text appears in visible "jumps" every ~50ms, containing multiple tokens per batch.

### Expected Behavior

```
[0ms]   "Hel"
[8ms]   "lo "
[16ms]  "wor"
[24ms]  "ld,"
[32ms]  " ho"
[40ms]  "w "
... (smoother continuous flow)
```

Text flows continuously like typing, with character-level reveal at ~120 chars/sec.

### Why Smooth Streaming Matters

1. **Perception of speed**: Smooth streaming feels faster than chunky batches
2. **Reading flow**: Users can track text as it appears, not catch up after jumps
3. **Professional polish**: ChatGPT and Claude use similar smoothing techniques
4. **Reduced anxiety**: Continuous progress feels more reassuring than bursts

---

## Current Implementation

**File**: `packages/backend/convex/generation.ts`

```typescript
// Server-side batching - 50ms intervals
const UPDATE_INTERVAL = 50;

if (now - lastUpdate >= UPDATE_INTERVAL) {
  await ctx.runMutation(internal.messages.updatePartialContent, {
    messageId: assistantMessageId,
    partialContent: accumulated,
  });
  lastUpdate = now;
}
```

**File**: `apps/web/src/hooks/useStreamBuffer.ts`

```typescript
// Client-side word reveal - 30 words/sec via RAF
const tick = () => {
  const wordsToRelease = Math.floor((elapsed / 1000) * wordsPerSecond);
  // Releases words at 30 words/sec
};
```

Current behavior:
- Server sends batches every 50ms
- Client smooths to 30 words/sec via RAF
- But transitions between batches can feel abrupt

---

## Solution

Implement character-level buffering with RAF-based reveal, optionally with punctuation-aware pauses.

### Step 1: Enhanced Stream Buffer Hook

**File**: `apps/web/src/hooks/useStreamBuffer.ts`

```typescript
const CHARS_PER_SECOND = 120; // ~30 words/sec at 4 chars/word

interface UseStreamBufferProps {
  content: string;
  isStreaming: boolean;
  charsPerSecond?: number;
}

export function useStreamBuffer({
  content,
  isStreaming,
  charsPerSecond = CHARS_PER_SECOND,
}: UseStreamBufferProps) {
  const [displayContent, setDisplayContent] = useState("");
  const bufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);
  const lastTickRef = useRef(Date.now());
  const displayLengthRef = useRef(0);

  // When new content arrives, add to buffer
  useEffect(() => {
    if (!isStreaming) {
      // Streaming ended - show all content immediately
      setDisplayContent(content);
      displayLengthRef.current = content.length;
      bufferRef.current = "";
      return;
    }

    // Calculate new characters to buffer
    const newChars = content.slice(displayLengthRef.current + bufferRef.current.length);
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
        const releaseCount = Math.min(charsToRelease, bufferRef.current.length);
        const chunk = bufferRef.current.slice(0, releaseCount);
        bufferRef.current = bufferRef.current.slice(releaseCount);

        setDisplayContent(prev => {
          const newContent = prev + chunk;
          displayLengthRef.current = newContent.length;
          return newContent;
        });
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

  return displayContent;
}
```

### Step 2: Punctuation-Aware Variant (Optional Enhancement)

For more natural reading rhythm:

```typescript
const PUNCTUATION_PAUSE_MS = 30; // ms pause after . ! ?
const WORD_BOUNDARY_PAUSE_MS = 10; // ms pause after space
const BASE_CHAR_INTERVAL_MS = 8; // ms between regular characters

export function useStreamBufferWithRhythm({
  content,
  isStreaming,
}: UseStreamBufferProps) {
  const [displayContent, setDisplayContent] = useState("");
  const bufferRef = useRef("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const releaseNextChar = useCallback(() => {
    if (bufferRef.current.length === 0) return;

    const char = bufferRef.current[0];
    const nextChar = bufferRef.current[1] || '';
    bufferRef.current = bufferRef.current.slice(1);

    setDisplayContent(prev => prev + char);

    // Calculate delay before next character
    let delay = BASE_CHAR_INTERVAL_MS;
    if (['.', '!', '?'].includes(char) && nextChar === ' ') {
      delay = PUNCTUATION_PAUSE_MS;
    } else if (char === ' ') {
      delay = WORD_BOUNDARY_PAUSE_MS;
    }

    // Schedule next character
    if (bufferRef.current.length > 0) {
      timeoutRef.current = setTimeout(releaseNextChar, delay);
    }
  }, []);

  // When new content arrives, add to buffer and start release
  useEffect(() => {
    if (!isStreaming) {
      setDisplayContent(content);
      bufferRef.current = "";
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const newChars = content.slice(displayContent.length + bufferRef.current.length);
    if (newChars) {
      const wasEmpty = bufferRef.current.length === 0;
      bufferRef.current += newChars;

      // Start releasing if buffer was empty
      if (wasEmpty && !timeoutRef.current) {
        releaseNextChar();
      }
    }
  }, [content, isStreaming, displayContent.length, releaseNextChar]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return displayContent;
}
```

### Step 3: Integrate with Markdown Content

**File**: `apps/web/src/components/chat/MarkdownContent.tsx`

```typescript
import { useStreamBuffer } from '@/hooks/useStreamBuffer';

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownContent({ content, isStreaming = false }: MarkdownContentProps) {
  // Apply smoothing during streaming
  const displayContent = useStreamBuffer({
    content,
    isStreaming,
    charsPerSecond: 120,
  });

  return (
    <div className="markdown-content">
      <Markdown>{displayContent}</Markdown>
    </div>
  );
}
```

### Step 4: Respect Reduced Motion Preference

```typescript
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export function MarkdownContent({ content, isStreaming }: MarkdownContentProps) {
  const reducedMotion = usePrefersReducedMotion();

  // Skip smoothing if user prefers reduced motion
  const displayContent = reducedMotion
    ? content
    : useStreamBuffer({ content, isStreaming });

  return <Markdown>{displayContent}</Markdown>;
}
```

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
- [ ] prefers-reduced-motion - should show instant text

### Unit Tests

```typescript
describe('useStreamBuffer', () => {
  it('should smooth character reveal during streaming', async () => {
    const { result, rerender } = renderHook(
      ({ content, isStreaming }) =>
        useStreamBuffer({ content, isStreaming }),
      { initialProps: { content: '', isStreaming: true } }
    );

    // Simulate batch arriving
    rerender({ content: 'Hello world', isStreaming: true });

    // Should not immediately show all content
    expect(result.current.length).toBeLessThan(11);

    // Wait for characters to be released
    await waitFor(
      () => expect(result.current).toBe('Hello world'),
      { timeout: 500 }
    );
  });

  it('should show all content immediately when streaming ends', () => {
    const { result, rerender } = renderHook(
      ({ content, isStreaming }) =>
        useStreamBuffer({ content, isStreaming }),
      { initialProps: { content: 'Hello', isStreaming: true } }
    );

    // End streaming
    rerender({ content: 'Hello world!', isStreaming: false });

    // Should immediately show full content
    expect(result.current).toBe('Hello world!');
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Visual chunk interval | ~50ms | ~8-16ms | Smoother |
| Perceived smoothness | 6/10 | 9/10 | Professional |
| DB mutations per message | N | N (unchanged) | No overhead |
| Client CPU impact | Low | Low (RAF efficient) | No regression |
| User perception | "Chunky" | "Fluid" | Natural |

---

## Risk Assessment

- **Breaking Changes**: None - internal display improvement
- **Performance**: RAF is very efficient, < 1ms per frame
- **Browser Support**: RAF 99%+
- **Accessibility**: Respects prefers-reduced-motion
- **Complexity**: Moderate - buffer management requires care

---

## References

- **Sources**: claude/04-streaming-smoothness.md, IMPLEMENTATION-SPECIFICATION.md
- **Open WebUI Pattern**: Delta chunking with 1-3 chars and 5ms delays
- **requestAnimationFrame**: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
- **Related Issues**: P4-streaming/02-status-timeline.md
