# Haptic Feedback

> **Priority**: P1 (Important)
> **Effort**: Low (< 1 hour)
> **Impact**: Medium - Adds tactile polish on mobile devices

---

## Summary

Add subtle haptic feedback (vibration) for key user actions on mobile devices. This provides tactile confirmation that enhances the feeling of interactivity and responsiveness.

---

## Current State

**Status**: No haptic feedback implemented

Searched codebase for `vibrate`, `haptic`, `Haptic` - no results.

---

## Problem

### Why Haptic Feedback Matters

1. **Confirmation**: Users feel that their action was registered
2. **Polish**: Native apps use haptics extensively; web apps without feel "flat"
3. **Accessibility**: Provides non-visual feedback for users who may miss visual cues
4. **Delight**: Small touch that makes the app feel premium

### What Open WebUI Does

```javascript
// From Open WebUI - haptic during streaming
navigator.vibrate(5); // 5ms vibration pulse during response streaming
```

### Industry Standard

| App | Haptic Usage |
|-----|--------------|
| iOS Messages | Send, receive, reactions |
| WhatsApp | Send, reactions, voice record |
| Slack | Minimal (badge actions) |
| ChatGPT | None |
| Claude | None |

This is an opportunity to differentiate from ChatGPT/Claude.

---

## Solution

### Implementation

**1. Create haptic utility:**

```typescript
// apps/web/src/lib/utils/haptics.ts

type HapticPattern = 'light' | 'medium' | 'success' | 'error' | 'warning';

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,           // Single light tap
  medium: 25,          // Slightly stronger
  success: [50, 30, 50], // Success pattern
  error: [100, 50, 100, 50, 100], // Error triple pulse
  warning: [30, 20, 30], // Warning double pulse
};

export function haptic(pattern: HapticPattern = 'light'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(patterns[pattern]);
    } catch {
      // Silently fail - haptics are enhancement, not critical
    }
  }
}

// Convenience functions
export const hapticLight = () => haptic('light');
export const hapticMedium = () => haptic('medium');
export const hapticSuccess = () => haptic('success');
export const hapticError = () => haptic('error');
```

**2. Add to send message action:**

```typescript
// apps/web/src/components/chat/ChatInput.tsx

import { hapticLight } from '@/lib/utils/haptics';

const handleSubmit = async (e?: React.FormEvent) => {
  // ... validation ...

  hapticLight(); // Vibrate on send

  // ... send logic ...
};
```

**3. Add to message actions:**

```typescript
// apps/web/src/components/chat/MessageActions.tsx

import { hapticLight, hapticSuccess } from '@/lib/utils/haptics';

// Copy action
const handleCopy = async () => {
  await navigator.clipboard.writeText(content);
  hapticSuccess();
  // ... rest of copy logic
};

// Delete action
const handleDelete = async () => {
  hapticMedium();
  // ... delete logic
};
```

**4. Add during streaming (optional - like Open WebUI):**

```typescript
// apps/web/src/components/chat/ChatMessage.tsx

useEffect(() => {
  if (message.status === 'generating' && !hasVibrated.current) {
    hapticLight(); // Single pulse when streaming starts
    hasVibrated.current = true;
  }
}, [message.status]);
```

### Where to Add Haptics

| Action | Pattern | Rationale |
|--------|---------|-----------|
| Send message | `light` | Confirmation of send |
| Copy to clipboard | `success` | Success feedback |
| Delete message | `medium` | Slightly stronger for destructive |
| Branch conversation | `light` | Confirmation |
| Stop generation | `light` | Acknowledgment |
| Error occurs | `error` | Alert pattern |
| Voice recording start | `light` | Recording started |
| Voice recording stop | `success` | Recording complete |

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/lib/utils/haptics.ts` | Create new utility |
| `apps/web/src/components/chat/ChatInput.tsx` | Add to send |
| `apps/web/src/components/chat/MessageActions.tsx` | Add to copy/delete |
| `apps/web/src/components/chat/ChatMessage.tsx` | Optional: streaming start |

---

## Testing

### Manual Testing

1. Open app on mobile device (or Chrome DevTools mobile emulation)
2. Enable vibration in device settings
3. Send a message
4. **Expected**: Brief vibration on send
5. Copy a message
6. **Expected**: Success vibration pattern

### Device Support

| Platform | Support |
|----------|---------|
| Android Chrome | Full support |
| Android Firefox | Full support |
| iOS Safari | No support (Apple restriction) |
| iOS Chrome | No support (uses WebKit) |
| Desktop | Typically no support |

Note: iOS does not support Web Vibration API. Haptics will silently no-op.

### Automated Testing

```typescript
// __tests__/haptics.test.ts
describe('haptics', () => {
  beforeEach(() => {
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: jest.fn(),
      writable: true,
    });
  });

  it('calls vibrate with correct pattern', () => {
    hapticLight();
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it('handles missing vibrate API gracefully', () => {
    delete (navigator as any).vibrate;
    expect(() => hapticLight()).not.toThrow();
  });
});
```

---

## References

### Web Vibration API

```typescript
// MDN: Vibration API
navigator.vibrate(200);        // Vibrate for 200ms
navigator.vibrate([100, 50, 100]); // Vibrate, pause, vibrate
navigator.vibrate(0);          // Stop vibration
```

### Open WebUI Pattern

```javascript
// Simple 5ms pulse during streaming
navigator.vibrate(5);
```

### iOS Limitations

iOS Safari does not support the Vibration API. For iOS haptics, you would need:
- Native app with `UIImpactFeedbackGenerator`
- Capacitor/Cordova plugin
- PWA with native wrapper

For web-only, accept that iOS will not have haptics.

---

## Notes

- **Always graceful degradation** - haptics are enhancement, never required
- **Keep it subtle** - 10-50ms for most actions, longer patterns for important events
- **Respect user preferences** - Consider adding a setting to disable
- **iOS limitation** - Accept that iOS web won't have haptics
- **Don't overuse** - Too much vibration is annoying
