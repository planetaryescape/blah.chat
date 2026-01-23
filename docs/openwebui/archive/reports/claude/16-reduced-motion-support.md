# Reduced Motion Support

> **Priority**: P3 (Accessibility)
> **Effort**: Low (1-2 hours)
> **Impact**: Medium - Required for users with vestibular disorders

---

## Summary

Respect the `prefers-reduced-motion` system preference by disabling or simplifying animations for users who have motion sensitivity. This is both an accessibility requirement and a user preference.

---

## Current State

**File**: `apps/web/src/app/globals.css`

There's a global reduced motion rule:

```css
@media (prefers-reduced-motion: reduce) {
  .message-enter,
  .fade-scale-in {
    animation: none;
    transition: none;
  }
}
```

However, coverage may be incomplete - need to ensure all animations respect this preference.

---

## Problem

### Who Needs Reduced Motion?

1. **Vestibular disorders**: Motion can cause dizziness, nausea
2. **Photosensitive epilepsy**: Flashing/motion can trigger seizures
3. **Cognitive conditions**: Motion can be distracting
4. **Personal preference**: Some users simply prefer less motion
5. **Battery/performance**: Fewer animations = better performance

### WCAG Requirements

- **2.3.3 Animation from Interactions** (Level AAA): Motion triggered by interaction can be disabled
- **2.3.1 Three Flashes** (Level A): No content flashes more than 3 times per second

---

## Solution

### 1. Global CSS Rule

**File**: `apps/web/src/app/globals.css`

```css
/* Comprehensive reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Specific overrides for critical animations */
  .message-enter {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .typing-indicator .dot {
    animation: none;
  }

  .skeleton {
    animation: none;
    opacity: 0.5;
  }

  /* Loading spinners should still indicate loading */
  .spinner {
    animation: none;
    /* Show static spinner icon instead */
  }

  /* Smooth scroll should be instant */
  html {
    scroll-behavior: auto;
  }
}
```

### 2. React Hook for Conditional Logic

```typescript
// apps/web/src/hooks/usePrefersReducedMotion.ts

import { useState, useEffect } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Server-side default to true (safer)
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}
```

### 3. Conditional Framer Motion

```typescript
// apps/web/src/components/chat/ChatMessage.tsx

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

function ChatMessage({ message }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      {/* Message content */}
    </motion.div>
  );
}
```

### 4. Scroll Behavior

```typescript
// Conditional smooth scroll
function scrollToBottom(container: HTMLElement) {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  container.scrollTo({
    top: container.scrollHeight,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}
```

### 5. Loading Indicators

For reduced motion users, replace animated loaders with static alternatives:

```typescript
function LoadingIndicator() {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return (
      <span className="text-sm text-muted-foreground">
        Loading...
      </span>
    );
  }

  return (
    <div className="flex gap-1">
      <span className="animate-bounce">.</span>
      <span className="animate-bounce delay-150">.</span>
      <span className="animate-bounce delay-300">.</span>
    </div>
  );
}
```

### What to Disable vs Keep

| Animation Type | Reduced Motion Behavior |
|----------------|------------------------|
| Decorative animations | Disable completely |
| Page transitions | Make instant |
| Loading spinners | Show static indicator |
| Scroll animations | Use `scroll-behavior: auto` |
| Hover effects | Keep (not motion-triggered) |
| Focus indicators | Keep (essential for a11y) |
| Progress indicators | Keep (shows state) |
| Error shake | Disable or reduce |

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/app/globals.css` | Comprehensive media query |
| `apps/web/src/hooks/usePrefersReducedMotion.ts` | Create hook |
| `apps/web/src/components/chat/ChatMessage.tsx` | Conditional animation |
| `apps/web/src/components/chat/MessageLoadingState.tsx` | Static alternative |
| Components using Framer Motion | Add reduced motion check |

---

## Testing

### Enable Reduced Motion

**macOS**: System Preferences → Accessibility → Display → Reduce motion
**Windows**: Settings → Ease of Access → Display → Show animations
**iOS**: Settings → Accessibility → Motion → Reduce Motion
**Chrome DevTools**: Rendering → Emulate CSS media feature → prefers-reduced-motion

### Manual Testing

1. Enable reduced motion in system settings
2. Navigate through the app
3. Verify:
   - No sliding/fading animations
   - No bouncing dots
   - Scroll is instant
   - Loading states show text instead of animation
4. Disable reduced motion
5. Verify animations return

### Checklist

- [ ] Message entry animation disabled
- [ ] Typing indicator shows static text
- [ ] Skeleton loaders don't pulse
- [ ] Smooth scroll becomes instant
- [ ] Modal transitions are instant
- [ ] Toast notifications appear instantly
- [ ] Error shake is disabled

---

## References

### MDN Documentation

```css
@media (prefers-reduced-motion: reduce) {
  /* Styles for users who prefer reduced motion */
}

@media (prefers-reduced-motion: no-preference) {
  /* Styles for users who haven't expressed a preference */
}
```

### WCAG 2.1 Guidelines

- **Guideline 2.3**: Seizures and Physical Reactions
- **Success Criterion 2.3.3**: Animation from Interactions (Level AAA)

### Framer Motion

```typescript
// Framer Motion respects reduced motion by default when using:
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  // Will be instant if prefers-reduced-motion is set
/>

// To explicitly handle:
import { useReducedMotion } from 'framer-motion';
const shouldReduceMotion = useReducedMotion();
```

---

## Notes

- **Default to reducing motion** on server (safer assumption)
- **Don't remove all animation** - keep essential state indicators
- **Test with actual users** if possible
- **Framer Motion has built-in support** - use `useReducedMotion()` hook
- **Preference can change** - listen for media query changes
