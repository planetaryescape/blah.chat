# Mobile Safe Area Handling

> **Priority**: P3 (Mobile)
> **Effort**: Low (1-2 hours)
> **Impact**: Medium - Prevents content from being hidden by notch/home indicator

---

## Summary

Ensure proper handling of safe area insets on mobile devices with notches (iPhone X+), home indicators, and other display cutouts. Content should not be obscured by hardware features.

---

## Current State

**File**: `apps/web/src/components/chat/ChatInput.tsx`

There is some safe area handling:

```typescript
// Line ~303
className="pb-[calc(1rem+env(safe-area-inset-bottom))]"
```

However, coverage may be incomplete across the app.

---

## Problem

### What Are Safe Areas?

Modern phones have:
- **Notch/Dynamic Island** (top) - camera/sensors cutout
- **Home Indicator** (bottom) - swipe bar on gesture-nav phones
- **Rounded Corners** - content near edges can be clipped

Without safe area handling:
- Chat input hidden behind home indicator
- Header text cut off by notch
- Sidebar edges clipped by rounded corners

### Affected Devices

| Device | Top Inset | Bottom Inset |
|--------|-----------|--------------|
| iPhone X-15 | ~47px (notch) | ~34px (home indicator) |
| Android (gesture) | Varies | ~48px (navigation bar) |
| iPad | Minimal | Minimal |

---

## Solution

### 1. Enable Safe Area Insets

**File**: `apps/web/src/app/layout.tsx`

```html
<!-- Ensure viewport meta allows safe area access -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

The `viewport-fit=cover` is required for `env()` to work.

### 2. Apply CSS Variables

**File**: `apps/web/src/app/globals.css`

```css
:root {
  /* Define safe area variables for easier use */
  --sat: env(safe-area-inset-top, 0px);
  --sar: env(safe-area-inset-right, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
}

/* App container should respect all safe areas */
.app-container {
  padding-top: var(--sat);
  padding-right: var(--sar);
  padding-bottom: var(--sab);
  padding-left: var(--sal);
}

/* Alternative: Only add safe area to specific elements */
.header {
  padding-top: max(1rem, var(--sat));
}

.chat-input-container {
  padding-bottom: max(1rem, var(--sab));
}

.sidebar {
  padding-left: max(1rem, var(--sal));
}
```

### 3. Component-Level Application

**Header:**

```typescript
// apps/web/src/components/header/Header.tsx
<header className="pt-[max(1rem,env(safe-area-inset-top))]">
  {/* Header content */}
</header>
```

**Chat Input:**

```typescript
// apps/web/src/components/chat/ChatInput.tsx
<div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
  {/* Input area */}
</div>
```

**Sidebar:**

```typescript
// apps/web/src/components/sidebar/Sidebar.tsx
<aside className="pl-[max(0.5rem,env(safe-area-inset-left))]">
  {/* Sidebar content */}
</aside>
```

**Modals/Dialogs:**

```typescript
// Full-screen modals should also respect safe areas
<DialogContent className="p-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
  {/* Modal content */}
</DialogContent>
```

### 4. Dynamic Viewport Height

Use `dvh` instead of `vh` for height calculations:

```css
/* Old - doesn't account for mobile browser chrome */
.chat-container {
  height: 100vh;
}

/* New - accounts for address bar, keyboard, etc. */
.chat-container {
  height: 100dvh;
}

/* With safe area */
.chat-container {
  min-height: 100dvh;
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 5. Tailwind Custom Utilities

```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-right': 'env(safe-area-inset-right)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
      },
    },
  },
}

// Usage
<div className="pb-safe-bottom pt-safe-top">
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/app/layout.tsx` | Ensure `viewport-fit=cover` |
| `apps/web/src/app/globals.css` | Add CSS variables |
| `apps/web/src/components/chat/ChatInput.tsx` | Verify bottom padding |
| `apps/web/src/components/header/Header.tsx` | Add top padding |
| `apps/web/src/components/sidebar/Sidebar.tsx` | Add left padding |
| `tailwind.config.ts` | Optional utilities |

---

## Testing

### Device Testing

1. Test on iPhone with notch (X, 11, 12, 13, 14, 15)
2. Test on Android with gesture navigation
3. Test in both portrait and landscape

### Chrome DevTools

1. Open DevTools
2. Toggle device toolbar (Cmd+Shift+M)
3. Select iPhone 12 Pro or similar
4. Verify safe areas are respected

### Visual Checklist

- [ ] Header text not cut off by notch
- [ ] Chat input not hidden by home indicator
- [ ] Sidebar content visible near left edge
- [ ] Landscape mode handles side insets
- [ ] Full-screen modals respect safe areas

---

## References

### CSS env() Function

```css
/* Basic usage */
padding-top: env(safe-area-inset-top);

/* With fallback */
padding-top: env(safe-area-inset-top, 20px);

/* With max() for minimum padding */
padding-top: max(20px, env(safe-area-inset-top));

/* In calc() */
height: calc(100vh - env(safe-area-inset-bottom));
```

### Browser Support

| Browser | env() Support |
|---------|---------------|
| Safari iOS | Full |
| Chrome iOS | Full |
| Chrome Android | Full (since v69) |
| Firefox | Full |

### Apple Human Interface Guidelines

> "Respect the safe areas. The safe area on a device defines the area within a view that isn't covered by a navigation bar, tab bar, toolbar, or other view."

---

## Notes

- **viewport-fit=cover is required** - without it, env() returns 0
- **Don't assume inset values** - they vary by device
- **Use max() for minimum spacing** - ensures padding even without insets
- **Test in landscape** - left/right insets become relevant
- **PWA mode may differ** - test standalone mode separately
