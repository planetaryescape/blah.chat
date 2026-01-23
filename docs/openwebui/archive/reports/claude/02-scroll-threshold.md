# Scroll Threshold Optimization

> **Priority**: P0 (Critical)
> **Effort**: Low (< 30 minutes)
> **Impact**: Medium - Improves scroll-to-bottom button behavior

---

## Summary

Reduce the "at bottom" scroll threshold from 100px to 50px to match industry standards. The current 100px threshold is too generous, causing the scroll-to-bottom button to disappear too early when users are still meaningfully scrolled up.

---

## Current State

**File**: `apps/web/src/components/chat/VirtualizedMessageList.tsx`

### Current Thresholds

**Virtuoso mode (≥500 messages):**
```typescript
// Line 241
<Virtuoso
  atBottomThreshold={100}  // 100px threshold
  // ...
/>
```

**Simple mode (<500 messages):**
```typescript
// Line 130-131
const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
const isAtBottom = distanceFromBottom < 100;  // 100px threshold
```

**Mobile (React Native):**
```typescript
// apps/mobile/components/chat/ScrollToBottomButton.tsx:15
const showButton = offsetY > 200;  // 200px threshold - even more generous
```

---

## Problem

### Why 100px is Too Much

1. **False "at bottom" detection**: User scrolls up 80px to re-read something, but system thinks they're "at bottom" and keeps auto-scrolling
2. **Button disappears too early**: Scroll-to-bottom button vanishes when user is still clearly not at the bottom
3. **Industry mismatch**: Open WebUI uses 50px, most chat apps use 50-100px

### Visual Example

```
┌────────────────────────┐
│ [Older messages...]    │
│                        │
│ Message 1              │
│ Message 2              │ ← User scrolled to here
│ Message 3              │
│________________________│ ← 100px from bottom
│ [New message arrives]  │ ← Visible area bottom
│                        │
│ [Input area]           │
└────────────────────────┘

With 100px threshold: System thinks user is "at bottom", auto-scrolls
With 50px threshold: System knows user scrolled up, shows "new messages" button
```

### User Impact
- Jarring scroll jumps when reading older messages
- New content pushes viewport unexpectedly
- Users lose their reading position

---

## Solution

### Change Threshold Values

**1. VirtualizedMessageList.tsx - Virtuoso mode:**
```typescript
// Line 241 - change from 100 to 50
<Virtuoso
  atBottomThreshold={50}  // Changed from 100
  // ...
/>
```

**2. VirtualizedMessageList.tsx - Simple mode:**
```typescript
// Line 130-131 - change from 100 to 50
const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
const isAtBottom = distanceFromBottom < 50;  // Changed from 100
```

**3. Mobile ScrollToBottomButton.tsx:**
```typescript
// Line 15 - change from 200 to 100 (more reasonable for mobile)
const showButton = offsetY > 100;  // Changed from 200
```

### Why 50px?

| Threshold | Pros | Cons |
|-----------|------|------|
| 25px | Very precise | Too sensitive, button flickers |
| **50px** | Industry standard, good balance | - |
| 100px | Forgiving | Too loose, false positives |
| 200px | Very forgiving | Way too loose for desktop |

50px is approximately:
- 2-3 lines of text
- Accounts for minor scroll inertia
- Matches Open WebUI and other chat apps

---

## Files to Modify

| File | Line | Change |
|------|------|--------|
| `apps/web/src/components/chat/VirtualizedMessageList.tsx` | ~241 | `atBottomThreshold={50}` |
| `apps/web/src/components/chat/VirtualizedMessageList.tsx` | ~131 | `< 50` |
| `apps/mobile/components/chat/ScrollToBottomButton.tsx` | ~15 | `> 100` |

---

## Testing

### Manual Testing - Desktop
1. Open a long conversation (20+ messages)
2. Scroll up ~60px (about 3 lines of text)
3. **Before fix**: Scroll-to-bottom button hidden
4. **After fix**: Scroll-to-bottom button visible
5. Type a new message or receive streaming response
6. **Before fix**: Auto-scrolls even though user scrolled up
7. **After fix**: Stays in place, shows button/indicator

### Manual Testing - Mobile
1. Open conversation in mobile view
2. Scroll up ~150px
3. **Before fix**: No scroll button (threshold is 200px)
4. **After fix**: Scroll button visible

### Edge Cases
- [ ] Fast scrolling with momentum - button should not flicker
- [ ] Streaming message growing - should not fight user scroll
- [ ] Very short conversations - should work same as long ones
- [ ] Virtuoso mode (500+ messages) - same behavior as simple mode

---

## References

### Open WebUI Pattern
```javascript
// From Open WebUI Messages.svelte
const autoScroll = element.scrollTop > scrollableDistance - 50;
// They use 50px threshold
```

### Research Findings
From state-of-the-art chat UI research:
> "Smart auto-scroll: only scroll if user is near bottom. The threshold should be small enough (50-150px) that users don't get yanked to the bottom when reading, but large enough to account for natural scroll drift."

### Virtuoso Documentation
React Virtuoso recommends:
- `atBottomThreshold={50}` for chat interfaces
- Higher values for interfaces where "near bottom" is acceptable

---

## Related Improvements

After implementing this, consider:
1. **"New messages" indicator** when user is scrolled up (not just the button)
2. **Smooth scroll behavior** during streaming (`behavior: 'smooth'`)
3. **Scroll position lock** during active generation (prevent fighting)

---

## Notes

- This is a **behavioral change** - test thoroughly before deploying
- Mobile threshold (100px) is intentionally higher than desktop (50px) due to touch scrolling imprecision
- The button animation timing (200ms) is good - don't change that
