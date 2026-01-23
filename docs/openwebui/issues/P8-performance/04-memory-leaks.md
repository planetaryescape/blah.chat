# Memory Leak Prevention

> **Phase**: P8-performance | **Effort**: 1h | **Impact**: Stable long sessions
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

Long chat sessions experience memory growth that doesn't release, causing sluggish performance after 30+ minutes of use. Common causes include event listeners not cleaned up, subscriptions not cancelled, timers not cleared, and WebSocket handlers accumulating. Users need to refresh the page to restore performance.

### Current Behavior

- Memory grows continuously during session
- No cleanup on component unmount
- Event listeners accumulate
- Subscriptions remain active
- After 30min: noticeable slowdown
- After 60min: page needs refresh

### Expected Behavior

- Memory stable during long sessions
- All cleanup on unmount
- Event listeners removed
- Subscriptions cancelled
- Performance consistent over hours

---

## Current Implementation

No systematic cleanup patterns. Some components may have partial cleanup.

---

## Solution

Implement systematic cleanup patterns across all components and hooks.

### Step 1: Create Cleanup Hook

**File**: `apps/web/src/hooks/useCleanup.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';

type CleanupFn = () => void;

/**
 * Hook for managing cleanup functions
 * Automatically runs all registered cleanups on unmount
 */
export function useCleanup() {
  const cleanupsRef = useRef<Set<CleanupFn>>(new Set());

  const registerCleanup = useCallback((cleanup: CleanupFn) => {
    cleanupsRef.current.add(cleanup);

    // Return function to remove this specific cleanup
    return () => {
      cleanupsRef.current.delete(cleanup);
    };
  }, []);

  const runCleanup = useCallback(() => {
    cleanupsRef.current.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
    cleanupsRef.current.clear();
  }, []);

  // Run all cleanups on unmount
  useEffect(() => {
    return runCleanup;
  }, [runCleanup]);

  return { registerCleanup, runCleanup };
}
```

### Step 2: Create Event Listener Hook

**File**: `apps/web/src/hooks/useEventListener.ts`

```typescript
import { useEffect, useRef } from 'react';

type EventMap = WindowEventMap & DocumentEventMap & HTMLElementEventMap;

export function useEventListener<K extends keyof EventMap>(
  eventName: K,
  handler: (event: EventMap[K]) => void,
  element: Window | Document | HTMLElement | null = window,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  // Update ref on handler change (no re-subscription)
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element) return;

    const eventListener = (event: Event) => {
      savedHandler.current(event as EventMap[K]);
    };

    element.addEventListener(eventName, eventListener, options);

    // Cleanup on unmount
    return () => {
      element.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}
```

### Step 3: Create Interval/Timeout Hooks

**File**: `apps/web/src/hooks/useInterval.ts`

```typescript
import { useEffect, useRef } from 'react';

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);

    // Cleanup on unmount or delay change
    return () => clearInterval(id);
  }, [delay]);
}

export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => savedCallback.current(), delay);

    return () => clearTimeout(id);
  }, [delay]);
}
```

### Step 4: Create Subscription Manager

**File**: `apps/web/src/lib/subscription-manager.ts`

```typescript
type Unsubscribe = () => void;

class SubscriptionManager {
  private subscriptions = new Map<string, Set<Unsubscribe>>();

  /**
   * Register a subscription with a scope
   */
  add(scope: string, unsubscribe: Unsubscribe): void {
    if (!this.subscriptions.has(scope)) {
      this.subscriptions.set(scope, new Set());
    }
    this.subscriptions.get(scope)!.add(unsubscribe);
  }

  /**
   * Remove a specific subscription
   */
  remove(scope: string, unsubscribe: Unsubscribe): void {
    this.subscriptions.get(scope)?.delete(unsubscribe);
  }

  /**
   * Clear all subscriptions in a scope
   */
  clearScope(scope: string): void {
    const scopeSubs = this.subscriptions.get(scope);
    if (scopeSubs) {
      scopeSubs.forEach((unsub) => {
        try {
          unsub();
        } catch (e) {
          console.error(`Subscription cleanup error in ${scope}:`, e);
        }
      });
      scopeSubs.clear();
    }
  }

  /**
   * Clear all subscriptions
   */
  clearAll(): void {
    this.subscriptions.forEach((subs, scope) => {
      this.clearScope(scope);
    });
    this.subscriptions.clear();
  }

  /**
   * Get subscription count (for debugging)
   */
  getCount(scope?: string): number {
    if (scope) {
      return this.subscriptions.get(scope)?.size || 0;
    }
    let total = 0;
    this.subscriptions.forEach((subs) => {
      total += subs.size;
    });
    return total;
  }
}

export const subscriptionManager = new SubscriptionManager();
```

### Step 5: Create ResizeObserver Hook with Cleanup

**File**: `apps/web/src/hooks/useResizeObserver.ts`

```typescript
import { useEffect, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

export function useResizeObserver<T extends HTMLElement>(): [
  React.RefObject<T>,
  Size
] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    observer.observe(element);

    // Cleanup on unmount
    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, size];
}
```

### Step 6: Apply Cleanup Patterns to Chat Components

**File**: `apps/web/src/components/chat/ChatPage.tsx`

```typescript
import { useCleanup } from '@/hooks/useCleanup';
import { useEventListener } from '@/hooks/useEventListener';
import { subscriptionManager } from '@/lib/subscription-manager';

export function ChatPage({ conversationId }: ChatPageProps) {
  const { registerCleanup } = useCleanup();

  // Clean up conversation-specific subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionManager.clearScope(`conversation:${conversationId}`);
    };
  }, [conversationId]);

  // Keyboard shortcuts with automatic cleanup
  useEventListener('keydown', handleKeyDown, document);

  // Window resize with automatic cleanup
  useEventListener('resize', handleResize, window);

  // Visibility change with automatic cleanup
  useEventListener('visibilitychange', handleVisibilityChange, document);

  // Register custom cleanup for any manual subscriptions
  useEffect(() => {
    const unsubscribe = someExternalService.subscribe((data) => {
      // Handle data
    });

    // Register for automatic cleanup
    return registerCleanup(unsubscribe);
  }, [registerCleanup]);

  return (/* ... */);
}
```

### Step 7: AbortController for Async Operations

**File**: `apps/web/src/hooks/useAbortableEffect.ts`

```typescript
import { useEffect, useRef } from 'react';

export function useAbortableEffect(
  effect: (signal: AbortSignal) => void | (() => void),
  deps: React.DependencyList
) {
  const abortControllerRef = useRef<AbortController>();

  useEffect(() => {
    // Abort previous effect
    abortControllerRef.current?.abort();

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Run effect with signal
    const cleanup = effect(controller.signal);

    return () => {
      controller.abort();
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Usage
function MessageLoader({ messageId }: { messageId: string }) {
  const [message, setMessage] = useState<Message | null>(null);

  useAbortableEffect((signal) => {
    fetchMessage(messageId, { signal })
      .then((data) => {
        if (!signal.aborted) {
          setMessage(data);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      });
  }, [messageId]);

  return (/* ... */);
}
```

### Step 8: Memory Monitoring (Development)

**File**: `apps/web/src/lib/memory-monitor.ts`

```typescript
export function startMemoryMonitor(intervalMs = 10000) {
  if (process.env.NODE_ENV !== 'development') return () => {};
  if (!performance.memory) return () => {};

  const samples: number[] = [];

  const id = setInterval(() => {
    const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
    const usedMB = usedJSHeapSize / 1024 / 1024;
    const totalMB = totalJSHeapSize / 1024 / 1024;

    samples.push(usedMB);
    if (samples.length > 60) samples.shift();

    // Calculate trend
    const avgRecent = samples.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const avgOld = samples.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(10, samples.length);
    const trend = avgRecent - avgOld;

    if (trend > 10) {
      console.warn('⚠️ Memory increasing rapidly:', {
        current: `${usedMB.toFixed(1)}MB`,
        trend: `+${trend.toFixed(1)}MB`,
        total: `${totalMB.toFixed(1)}MB`,
      });
    }
  }, intervalMs);

  return () => clearInterval(id);
}
```

---

## Testing

### Unit Tests

```typescript
describe('useCleanup', () => {
  it('should run cleanups on unmount', () => {
    const cleanup1 = jest.fn();
    const cleanup2 = jest.fn();

    const { unmount, result } = renderHook(() => useCleanup());

    result.current.registerCleanup(cleanup1);
    result.current.registerCleanup(cleanup2);

    unmount();

    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(cleanup2).toHaveBeenCalledTimes(1);
  });
});

describe('useEventListener', () => {
  it('should remove listener on unmount', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const handler = jest.fn();

    const { unmount } = renderHook(() =>
      useEventListener('resize', handler)
    );

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function), undefined);

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function), undefined);
  });
});

describe('SubscriptionManager', () => {
  it('should clear scope subscriptions', () => {
    const unsub1 = jest.fn();
    const unsub2 = jest.fn();

    subscriptionManager.add('test-scope', unsub1);
    subscriptionManager.add('test-scope', unsub2);

    subscriptionManager.clearScope('test-scope');

    expect(unsub1).toHaveBeenCalled();
    expect(unsub2).toHaveBeenCalled();
    expect(subscriptionManager.getCount('test-scope')).toBe(0);
  });
});
```

### Memory Leak Test

```typescript
describe('Memory Leaks', () => {
  it('should not leak event listeners', async () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    // Mount and unmount component 100 times
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<ChatPage conversationId="test" />);
      unmount();
    }

    // All listeners should be removed
    expect(addSpy.mock.calls.length).toBe(removeSpy.mock.calls.length);
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Memory after 30min | 500MB+ | 150MB | 70% reduction |
| Memory after 60min | 1GB+ (crash risk) | 150MB | Stable |
| Event listeners accumulated | Grows | Constant | No leaks |
| Performance at 60min | Sluggish | Fast | Consistent |
| Page refresh needed | Every 30-60min | Never | Eliminated |

---

## Risk Assessment

- **Risk Level**: LOW
- **Breaking Changes**: None (additive patterns)
- **Testing Required**: Medium (lifecycle behavior)
- **Compatibility**: All browsers
- **Maintenance**: Patterns should be applied consistently

---

## References

- **Sources**: deep-research-report.md, React documentation
- **React useEffect Cleanup**: https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development
- **AbortController**: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- **Related Issues**: P8-performance/02-object-pooling.md
