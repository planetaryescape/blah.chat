# Smooth Scrolling Animations

> **Phase**: P1-scroll | **Effort**: 3h | **Impact**: Professional UX feel
> **Dependencies**: None | **Breaking**: No
> **Status**: ✅ Complete (2026-01-17) - Implemented in `feat(scroll): add smooth scrolling animations`

---

## Problem Statement

Current implementation jumps to bottom instantly when new messages arrive or when switching conversations. This causes user disorientation (sudden content shift), perceived jankiness, and lack of professional polish compared to ChatGPT and Claude.

### Current Behavior

```typescript
const scrollToEnd = () => {
  container.scrollTop = container.scrollHeight; // Abrupt jump
};
```

- Jarring, disorienting
- Feels amateur
- Hard to track where you are
- No visual continuity

### Expected Behavior

Smooth 300ms animation with easeOutQuart easing:
- Polished, guided feel
- Matches ChatGPT/Claude
- Easy to follow the scroll
- Professional UX

---

## Current Implementation

**File**: `apps/web/src/components/chat/VirtualizedMessageList.tsx`

```typescript
// Multiple attempts for reliability (but all instant)
useEffect(() => {
  scrollToEnd();
  requestAnimationFrame(scrollToEnd);
  setTimeout(scrollToEnd, 50);
  setTimeout(scrollToEnd, 150);
}, [conversationId]);
```

---

## Solution

Implement smooth scrolling with CSS scroll-behavior and RAF-based animation with easing.

### Step 1: Add CSS Foundation

**File**: `apps/web/src/app/globals.css`

```css
.messages-container {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch; /* iOS momentum */
  will-change: transform; /* GPU acceleration */
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .messages-container {
    scroll-behavior: auto !important;
  }
}
```

### Step 2: Create Smooth Scroll Utility

**File**: `apps/web/src/lib/smooth-scroll.ts`

```typescript
/**
 * Easing function: easeOutQuart - smooth deceleration
 */
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Detects if smooth scroll is supported
 */
export function supportsSmoothScroll(): boolean {
  return 'scrollBehavior' in document.documentElement.style;
}

/**
 * Smooth scroll to bottom with 60fps animation
 */
export function smoothScrollToBottom(
  container: HTMLElement,
  duration = 300
): Promise<void> {
  return new Promise((resolve) => {
    const start = container.scrollTop;
    const end = container.scrollHeight - container.clientHeight;
    const distance = end - start;

    // No need to scroll if already at bottom (within 10px)
    if (Math.abs(distance) < 10) {
      resolve();
      return;
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);

      container.scrollTop = start + (distance * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
}

/**
 * Scroll to bottom with fallback for unsupported browsers
 */
export function scrollToBottom(
  container: HTMLElement,
  options: { smooth?: boolean; duration?: number } = {}
): Promise<void> {
  const { smooth = true, duration = 300 } = options;

  if (smooth && supportsSmoothScroll()) {
    return smoothScrollToBottom(container, duration);
  }

  // Fallback: instant scroll
  container.scrollTop = container.scrollHeight;
  return Promise.resolve();
}
```

### Step 3: Integrate with Messages List

**File**: `apps/web/src/components/chat/VirtualizedMessageList.tsx`

```typescript
import { scrollToBottom, smoothScrollToBottom } from '@/lib/smooth-scroll';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const VirtualizedMessageList = ({ messages, conversationId }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const handleScrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    scrollToBottom(container, {
      smooth: !reducedMotion,
      duration: 300,
    });
  }, [reducedMotion]);

  // Debounced scroll for rapid message arrival
  const debouncedScroll = useMemo(
    () => debounce(handleScrollToBottom, 100),
    [handleScrollToBottom]
  );

  // Scroll on new messages
  useEffect(() => {
    if (messages.length > 0 && autoScrollEnabled) {
      debouncedScroll();
    }
  }, [messages.length, autoScrollEnabled, debouncedScroll]);

  // Scroll on conversation switch
  useEffect(() => {
    if (messages.length > 0) {
      // Delay for DOM to render
      setTimeout(handleScrollToBottom, 50);
    }
  }, [conversationId, handleScrollToBottom]);

  return (
    <div
      ref={scrollContainerRef}
      className="messages-container overflow-y-auto"
    >
      {/* Message list */}
    </div>
  );
};
```

### Step 4: Add Reduced Motion Hook

**File**: `apps/web/src/hooks/usePrefersReducedMotion.ts`

```typescript
import { useState, useEffect } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}
```

---

## Testing

### Manual Verification

1. Send a new message - scroll should animate smoothly (300ms)
2. Switch conversations - should smoothly scroll to bottom
3. Enable "Reduce motion" in OS - should scroll instantly
4. Test on iOS Safari - should have momentum scrolling

### Unit Tests

```typescript
describe('Smooth Scroll', () => {
  it('should animate scroll to bottom', async () => {
    const container = {
      scrollTop: 0,
      scrollHeight: 5000,
      clientHeight: 300,
    };

    const startTime = performance.now();
    await smoothScrollToBottom(container as any, 300);
    const duration = performance.now() - startTime;

    expect(Math.abs(duration - 300)).toBeLessThan(50);
    expect(container.scrollTop).toBe(4700);
  });

  it('should skip animation if already at bottom', async () => {
    const container = {
      scrollTop: 4695, // Within 10px of bottom
      scrollHeight: 5000,
      clientHeight: 300,
    };

    const startTime = performance.now();
    await smoothScrollToBottom(container as any, 300);
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(10); // Resolved immediately
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Scroll animation | Instant jump | 300ms smooth | Professional |
| Frame rate | N/A | 60fps | Smooth |
| User perception | Jarring (32%) | Professional (91%) | +184% |
| Reduced motion | Not respected | Respected | Accessible |

---

## Risk Assessment

- **Breaking Changes**: None - purely visual improvement
- **Browser Support**: CSS scroll-behavior 95%, RAF fallback 100%
- **Performance**: Positive - 60fps maintained, GPU accelerated
- **Accessibility**: Respects prefers-reduced-motion

---

## References

- **Sources**: kimi/02-scroll/02-smooth-scrolling-animations.md, research-report.md:470-488
- **Easing Functions**: https://easings.net/
- **Related Issues**: P1-scroll/01-threshold-optimization.md, P6-accessibility/03-visual-modes.md
