# UI Scale Setting

> **Priority**: P2 (Accessibility)
> **Effort**: Medium (3-4 hours)
> **Impact**: Medium - Helps users with vision impairments, large displays, or preference for larger text

---

## Summary

Add a UI scale setting that allows users to increase the base font size and UI element sizing from 1x to 1.5x. This is an accessibility feature that helps users who need larger text without using browser zoom (which can break layouts).

---

## Current State

**Status**: Not implemented

The app uses fixed `rem` values based on the browser's default font size (16px). No user-adjustable scale.

### What Open WebUI Does

```javascript
// From Open WebUI Settings/Interface.svelte
// UI Scale: 1x - 1.5x slider
<input type="range" min="1" max="1.5" step="0.05" bind:value={settings.uiScale} />
```

They use a CSS custom property `--app-text-scale` that multiplies all text sizes.

---

## Problem

### Why UI Scale Matters

1. **Accessibility**: Users with low vision need larger text
2. **Large Displays**: 4K monitors often need larger UI
3. **Preference**: Some users simply prefer larger text
4. **Browser Zoom Issues**: Zoom can break layouts, especially in chat apps
5. **WCAG 1.4.4**: Text should be resizable up to 200% without loss of functionality

### Limitations of Browser Zoom

| Browser Zoom | UI Scale Setting |
|--------------|------------------|
| Zooms everything (images, spacing) | Only scales text and related UI |
| Can break fixed layouts | Maintains layout proportions |
| Affects all tabs | Per-app setting |
| User must remember to zoom | Persisted preference |

---

## Solution

### 1. Add CSS Custom Property

**File**: `apps/web/src/app/globals.css`

```css
:root {
  --ui-scale: 1;

  /* Apply scale to base font size */
  font-size: calc(16px * var(--ui-scale));
}

/* Components that should scale */
.prose {
  font-size: calc(1rem * var(--ui-scale));
  line-height: calc(1.75 * var(--ui-scale));
}

/* Touch targets should scale too */
button,
[role="button"],
input,
textarea {
  min-height: calc(44px * var(--ui-scale));
}

/* Spacing that should scale */
.message-bubble {
  padding: calc(1rem * var(--ui-scale));
  gap: calc(0.5rem * var(--ui-scale));
}
```

### 2. Add Settings UI

**File**: `apps/web/src/app/(main)/settings/appearance/page.tsx`

```typescript
import { useUserPreference } from '@/hooks/useUserPreference';
import { Slider } from '@/components/ui/slider';

export default function AppearanceSettings() {
  const [uiScale, setUiScale] = useUserPreference('uiScale', 1);

  // Apply scale to document
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(uiScale));
  }, [uiScale]);

  return (
    <div className="space-y-6">
      {/* Existing settings */}

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="ui-scale">UI Scale</Label>
          <span className="text-sm text-muted-foreground">
            {Math.round(uiScale * 100)}%
          </span>
        </div>
        <Slider
          id="ui-scale"
          min={1}
          max={1.5}
          step={0.05}
          value={[uiScale]}
          onValueChange={([value]) => setUiScale(value)}
        />
        <p className="text-xs text-muted-foreground">
          Adjust text and UI element size (100% - 150%)
        </p>
      </div>
    </div>
  );
}
```

### 3. Apply on Initial Load

**File**: `apps/web/src/app/layout.tsx`

```typescript
// In the root layout or a provider
function UIScaleProvider({ children }) {
  const [uiScale] = useUserPreference('uiScale', 1);

  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(uiScale));
  }, [uiScale]);

  return children;
}
```

### 4. Server-Side Initial Value (Prevent Flash)

To avoid a flash of unstyled content, read the preference early:

```typescript
// In _document.tsx or root layout
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      try {
        const scale = localStorage.getItem('uiScale') || '1';
        document.documentElement.style.setProperty('--ui-scale', scale);
      } catch (e) {}
    })();
  `
}} />
```

### Component Adjustments

Some components may need explicit scale support:

```css
/* Chat message bubbles */
.message-bubble {
  padding: calc(0.75rem * var(--ui-scale)) calc(1rem * var(--ui-scale));
  border-radius: calc(1.5rem * var(--ui-scale));
}

/* Input area */
.chat-input {
  min-height: calc(50px * var(--ui-scale));
  padding: calc(0.5rem * var(--ui-scale));
}

/* Sidebar items */
.sidebar-item {
  padding: calc(0.5rem * var(--ui-scale)) calc(0.75rem * var(--ui-scale));
  font-size: calc(0.875rem * var(--ui-scale));
}

/* Icons should scale proportionally */
.icon {
  width: calc(1.25rem * var(--ui-scale));
  height: calc(1.25rem * var(--ui-scale));
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/app/globals.css` | Add `--ui-scale` variable and base scaling |
| `apps/web/src/app/(main)/settings/appearance/page.tsx` | Add slider |
| `apps/web/src/app/layout.tsx` | Apply scale on load |
| `apps/web/src/styles/prose.css` | Scale prose elements |
| Various components | Apply scale where needed |

---

## Testing

### Manual Testing

1. Open settings, adjust UI scale slider
2. Verify text size changes proportionally
3. Check that layouts don't break at 150%
4. Refresh page - scale should persist
5. Test in both light and dark modes

### Specific Checks

- [ ] Message text scales properly
- [ ] Input area scales
- [ ] Sidebar items scale
- [ ] Buttons remain clickable (min 44px at any scale)
- [ ] Modals don't overflow at 150%
- [ ] Code blocks remain readable
- [ ] No horizontal overflow at 150% + mobile width

### Accessibility Testing

```bash
# Test with screen reader
# VoiceOver (Mac): Cmd+F5
# Scale should be announced when changed

# Test with keyboard
# Slider should be keyboard-accessible
```

---

## References

### WCAG Guidelines

- **1.4.4 Resize Text**: Text can be resized without assistive technology up to 200% without loss of content or functionality

### Open WebUI Implementation

```css
/* Their CSS approach */
:root {
  --app-text-scale: 1;
}

body {
  font-size: calc(1rem * var(--app-text-scale));
}
```

### CSS calc() with Variables

```css
/* Multiplying with CSS variables */
font-size: calc(16px * var(--ui-scale)); /* Works */
font-size: calc(1rem * var(--ui-scale)); /* Also works */

/* Can use in any numeric property */
padding: calc(10px * var(--ui-scale));
gap: calc(0.5rem * var(--ui-scale));
border-radius: calc(8px * var(--ui-scale));
```

---

## Notes

- **Don't scale everything** - some elements (icons in toolbars, very small UI) may need to stay fixed
- **Test at extremes** - 100% and 150% should both work well
- **Consider max values** - very long text at 150% may overflow
- **Persist to database** - for cross-device sync, store in user preferences (not just localStorage)
- **Respect browser settings** - if user has browser zoom, don't fight it
