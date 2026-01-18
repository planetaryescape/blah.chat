# High Contrast Mode

> **Priority**: P2 (Accessibility)
> **Effort**: Medium (4-6 hours)
> **Impact**: Medium - Required for WCAG compliance, helps users with visual impairments

---

## Summary

Implement a high contrast mode toggle that increases color contrast ratios throughout the UI. This is an accessibility requirement (WCAG 1.4.11) and helps users with low vision, color blindness, or those using the app in bright environments.

---

## Current State

**Status**: Not implemented

The app supports dark/light themes but no high contrast variant.

### Current Contrast Approach

From `apps/web/src/styles/` and Tailwind config:
- Uses CSS custom properties for theming
- Dark mode uses typical contrast ratios
- No `prefers-contrast` media query handling
- No `forced-colors` media query support

---

## Problem

### Why High Contrast Matters

1. **WCAG 1.4.11 Non-text Contrast**: UI components need 3:1 contrast ratio
2. **WCAG 1.4.3 Contrast (Minimum)**: Text needs 4.5:1 (normal) or 3:1 (large)
3. **Low Vision Users**: ~2.2 billion people globally have vision impairment
4. **Environmental Factors**: Bright sunlight, screen glare
5. **Cognitive Load**: High contrast reduces eye strain for everyone

### What Open WebUI Does

```javascript
// From Open WebUI Settings/Interface.svelte
// High Contrast Mode toggle (Beta)
<Toggle bind:value={settings.highContrastMode} />
```

They provide a simple toggle that applies increased contrast CSS.

---

## Solution

### 1. Add High Contrast CSS Variables

**File**: `apps/web/src/app/globals.css`

```css
/* High contrast theme overrides */
.high-contrast {
  /* Text colors - maximum contrast */
  --foreground: 0 0% 0%;           /* Pure black */
  --background: 0 0% 100%;          /* Pure white */
  --muted-foreground: 0 0% 20%;     /* Near black (was ~45%) */

  /* Borders - visible */
  --border: 0 0% 0%;                /* Black borders */
  --ring: 0 0% 0%;                  /* Black focus rings */

  /* Primary - high contrast blue */
  --primary: 220 100% 30%;          /* Darker, more saturated */
  --primary-foreground: 0 0% 100%;

  /* Destructive - high contrast red */
  --destructive: 0 100% 40%;        /* Darker red */

  /* Cards and surfaces */
  --card: 0 0% 100%;
  --card-foreground: 0 0% 0%;

  /* Accent */
  --accent: 220 100% 95%;
  --accent-foreground: 0 0% 0%;
}

/* Dark mode high contrast */
.dark.high-contrast {
  --foreground: 0 0% 100%;          /* Pure white */
  --background: 0 0% 0%;            /* Pure black */
  --muted-foreground: 0 0% 85%;     /* Near white */

  --border: 0 0% 100%;              /* White borders */
  --ring: 0 0% 100%;                /* White focus rings */

  --primary: 220 100% 70%;          /* Brighter blue */
  --primary-foreground: 0 0% 0%;

  --card: 0 0% 5%;
  --card-foreground: 0 0% 100%;
}

/* System high contrast mode support */
@media (prefers-contrast: more) {
  :root {
    /* Apply high contrast by default when system requests it */
    --foreground: 0 0% 0%;
    --background: 0 0% 100%;
    --border: 0 0% 0%;
    /* ... rest of high contrast variables */
  }
}

/* Windows High Contrast Mode */
@media (forced-colors: active) {
  /* Use system colors - browser handles this */
  .message-bubble {
    border: 2px solid CanvasText;
    background-color: Canvas;
  }

  button {
    border: 2px solid ButtonText;
  }

  /* Ensure SVG icons use currentColor */
  svg {
    fill: currentColor;
    stroke: currentColor;
  }
}
```

### 2. Add Settings Toggle

**File**: `apps/web/src/app/(main)/settings/appearance/page.tsx`

```typescript
// Add to appearance settings
import { useUserPreference } from '@/hooks/useUserPreference';

export default function AppearanceSettings() {
  const [highContrast, setHighContrast] = useUserPreference('highContrast', false);

  // Apply class to document
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);

  return (
    <div className="space-y-6">
      {/* Existing theme toggle */}

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="high-contrast">High Contrast Mode</Label>
          <p className="text-sm text-muted-foreground">
            Increase contrast for better visibility
          </p>
        </div>
        <Switch
          id="high-contrast"
          checked={highContrast}
          onCheckedChange={setHighContrast}
        />
      </div>
    </div>
  );
}
```

### 3. Apply Class at Root Level

**File**: `apps/web/src/app/layout.tsx`

```typescript
// Read preference and apply class on initial render
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <HighContrastProvider>
          {children}
        </HighContrastProvider>
      </body>
    </html>
  );
}

// Provider component
function HighContrastProvider({ children }) {
  const [highContrast] = useUserPreference('highContrast', false);

  useEffect(() => {
    // Check system preference as fallback
    const systemPrefers = window.matchMedia('(prefers-contrast: more)').matches;
    document.documentElement.classList.toggle(
      'high-contrast',
      highContrast || systemPrefers
    );
  }, [highContrast]);

  return children;
}
```

### Component-Level Adjustments

Some components may need explicit high contrast overrides:

```css
/* Code blocks in high contrast */
.high-contrast .prose pre {
  border: 2px solid var(--border);
  background: var(--background);
}

/* Message bubbles */
.high-contrast .message-bubble {
  border-width: 2px;
}

/* Focus states - thicker */
.high-contrast :focus-visible {
  outline-width: 3px;
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/app/globals.css` | Add high contrast CSS variables |
| `apps/web/src/app/(main)/settings/appearance/page.tsx` | Add toggle |
| `apps/web/src/app/layout.tsx` | Apply class at root |
| `apps/web/src/styles/prose.css` | Component-specific overrides |
| `packages/backend/convex/schema.ts` | Add to user preferences (optional) |

---

## Testing

### Manual Testing

1. Enable high contrast mode in settings
2. Verify all text is readable (high contrast)
3. Check that UI elements have visible borders
4. Test in both light and dark themes
5. Verify focus states are clearly visible

### Automated Contrast Testing

```bash
# Use axe-core or similar
npx axe-cli http://localhost:3000 --rules color-contrast
```

### System Preference Testing

**macOS**: System Preferences → Accessibility → Display → Increase contrast
**Windows**: Settings → Ease of Access → High contrast → Turn on

### Checklist

- [ ] Text contrast ≥ 7:1 (AAA level)
- [ ] UI component contrast ≥ 3:1
- [ ] Focus indicators clearly visible
- [ ] Works with both light and dark themes
- [ ] Respects system `prefers-contrast` preference
- [ ] Works with Windows High Contrast Mode (`forced-colors`)

---

## References

### WCAG Guidelines

- **1.4.3 Contrast (Minimum)** - Level AA: 4.5:1 for normal text
- **1.4.6 Contrast (Enhanced)** - Level AAA: 7:1 for normal text
- **1.4.11 Non-text Contrast** - Level AA: 3:1 for UI components

### CSS Color Keywords for forced-colors

| Keyword | Usage |
|---------|-------|
| `Canvas` | Page background |
| `CanvasText` | Text on Canvas |
| `LinkText` | Links |
| `ButtonFace` | Button backgrounds |
| `ButtonText` | Button text |
| `Highlight` | Selected items background |
| `HighlightText` | Selected items text |

### Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Stark (Figma plugin)](https://www.getstark.co/)
- Chrome DevTools → Rendering → Emulate CSS media feature

---

## Notes

- **Respect system preferences** - auto-enable when `prefers-contrast: more`
- **Test with real users** if possible - low vision users have specific needs
- **Don't just invert** - thoughtful contrast, not just white-on-black
- **Borders matter** - elements need clear boundaries in high contrast
- **Icons need adjustment** - ensure SVGs use `currentColor`
