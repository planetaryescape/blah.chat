# iOS Virtual Keyboard Handling

> **Status**: ✅ Complete (2026-01-18)
> **Phase**: P1-scroll | **Effort**: 4h | **Impact**: Mobile UX fix
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

On iOS Safari, when the virtual keyboard appears, it pushes the viewport up but can cover the input field. The input may be partially or fully hidden, making it difficult or impossible to see what's being typed. Additionally, iOS lacks momentum scrolling without proper CSS properties.

### Current Behavior

```
"On iPhone 15 Pro, when typing long message,
keyboard covers the input field after 3 lines.
Can't see what I'm typing."
```

Issues:
- Keyboard covers input field
- No momentum scrolling (feels sluggish)
- URL bar hiding/showing causes viewport jumps
- 300ms tap delay on older iOS versions

### Expected Behavior

- Input always visible above keyboard
- Smooth momentum scrolling
- Stable viewport handling
- No tap delays

---

## Current Implementation

**File**: `apps/web/src/app/globals.css`

```css
/* Missing iOS-specific optimizations */
.messages-container {
  overflow-y: auto;
  /* No -webkit-overflow-scrolling */
  /* No touch-action */
}
```

---

## Solution

Implement iOS-specific viewport handling and scroll optimizations.

### Step 1: Add iOS Scroll Optimizations

**File**: `apps/web/src/app/globals.css`

```css
.messages-container {
  overflow-y: auto;

  /* iOS momentum scrolling */
  -webkit-overflow-scrolling: touch;

  /* Prevent iOS tap delay */
  touch-action: manipulation;

  /* GPU acceleration */
  transform: translateZ(0);
}

/* iOS safe area handling */
.chat-container {
  padding-bottom: env(safe-area-inset-bottom);
}

.chat-input {
  padding-bottom: calc(env(safe-area-inset-bottom) + 8px);
}
```

### Step 2: Create iOS Keyboard Hook

**File**: `apps/web/src/hooks/useIOSKeyboard.ts`

```typescript
import { useEffect, useCallback, useState } from 'react';

export function useIOSKeyboard(inputRef: React.RefObject<HTMLElement>) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Only run on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      // Keyboard height = screen height - viewport height
      const screenHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const newKeyboardHeight = screenHeight - viewportHeight;

      setKeyboardVisible(newKeyboardHeight > 100);
      setKeyboardHeight(newKeyboardHeight);

      // Scroll input into view when keyboard appears
      if (newKeyboardHeight > 100 && inputRef.current) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
          });
        }, 100);
      }
    };

    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, [inputRef]);

  return { keyboardVisible, keyboardHeight };
}
```

### Step 3: Create iOS-Aware Input Container

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard';

export const ChatInput = () => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { keyboardVisible, keyboardHeight } = useIOSKeyboard(inputRef);

  // Adjust container when keyboard appears
  useEffect(() => {
    if (!containerRef.current) return;

    if (keyboardVisible) {
      // Add padding to push content above keyboard
      containerRef.current.style.paddingBottom = `${keyboardHeight}px`;
    } else {
      containerRef.current.style.paddingBottom = '';
    }
  }, [keyboardVisible, keyboardHeight]);

  return (
    <div ref={containerRef} className="chat-input-container">
      <textarea
        ref={inputRef}
        className="chat-input"
        placeholder="Type a message..."
      />
    </div>
  );
};
```

### Step 4: Handle Viewport Changes

**File**: `apps/web/src/hooks/useViewportStability.ts`

```typescript
import { useEffect } from 'react';

/**
 * Prevents viewport jump when iOS URL bar shows/hides
 */
export function useViewportStability() {
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;

    // Lock viewport on iOS to prevent URL bar affecting layout
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
      metaViewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover'
      );
    }

    // Handle orientation changes
    const handleOrientationChange = () => {
      // Force scroll to current position to stabilize viewport
      window.scrollTo(0, window.scrollY);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);
}
```

### Step 5: Update HTML Meta Tag

**File**: `apps/web/src/app/layout.tsx`

```tsx
export const metadata = {
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover', // iOS safe area support
  },
};
```

---

## Testing

### Manual Verification (iOS Device Required)

1. Open app on iPhone Safari
2. Tap input field - keyboard should appear
3. **Expected**: Input field stays visible above keyboard
4. Type a long message
5. **Expected**: Can see all typed text, no overlap
6. Scroll messages while keyboard open
7. **Expected**: Smooth momentum scrolling
8. Tap message (not input)
9. **Expected**: No 300ms delay

### Simulated Testing

```typescript
describe('iOS Keyboard Handling', () => {
  it('should detect keyboard appearance', () => {
    // Mock iOS environment
    Object.defineProperty(navigator, 'userAgent', {
      value: 'iPhone',
    });

    const { keyboardVisible } = renderHook(() =>
      useIOSKeyboard(mockInputRef)
    ).result.current;

    // Simulate viewport resize
    act(() => {
      window.visualViewport.height = 400; // Keyboard took 300px
      window.visualViewport.dispatchEvent(new Event('resize'));
    });

    expect(keyboardVisible).toBe(true);
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Input visibility | Covered | Always visible | Fixed |
| Momentum scroll | None | Smooth | iOS native |
| Tap delay | 300ms | 0ms | Removed |
| User reports | "Can't see typing" | None | Resolved |

---

## Risk Assessment

- **Breaking Changes**: None - iOS-specific enhancements
- **Other Platforms**: Hooks safely skip non-iOS
- **Testing**: Requires physical iOS device or simulator
- **Compatibility**: iOS 13+ (visualViewport API)

---

## References

- **Sources**: deep-research-report.md:121-151, IMPLEMENTATION-SPECIFICATION.md:608-649, claude/15-mobile-safe-area-handling.md
- **VisualViewport API**: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- **iOS Safe Areas**: https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- **Related Issues**: P1-scroll/05-anchoring.md
