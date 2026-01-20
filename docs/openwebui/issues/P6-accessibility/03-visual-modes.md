# Visual Accessibility Modes

> **Phase**: P6-accessibility | **Effort**: 3h | **Impact**: WCAG 1.4.3/1.4.11 compliance
> **Dependencies**: None | **Breaking**: No
> **Status**: ✅ Complete (2026-01-19)

---

## Problem Statement

Users with visual impairments (low vision, color blindness, photosensitivity) cannot adequately use the interface. The app lacks high contrast mode support, doesn't respect reduced motion preferences, and has insufficient contrast ratios in some UI elements. This excludes users who need visual accommodations.

### Current Behavior

- No high contrast mode
- Fixed color palette with some low-contrast elements
- Animations play regardless of user preference
- No support for Windows High Contrast Mode
- Text scaling may break layouts

### Expected Behavior

- High contrast toggle in settings
- Respect `prefers-contrast` media query
- Respect `prefers-reduced-motion` media query
- Support Windows High Contrast Mode (`forced-colors`)
- Fluid text scaling without layout breaks
- WCAG AA contrast ratios (4.5:1 text, 3:1 UI)

### WCAG Requirements

- **1.4.3 Contrast (Minimum)**: Level AA - 4.5:1 for text
- **1.4.11 Non-text Contrast**: Level AA - 3:1 for UI components
- **1.4.4 Resize Text**: Level AA - 200% zoom without loss
- **2.3.3 Animation from Interactions**: Level AAA - Reducible motion

---

## Current Implementation

No visual accessibility features implemented. Fixed color palette in Tailwind config.

---

## Solution

Implement high contrast mode, reduced motion support, and proper contrast ratios using CSS custom properties.

### Step 1: Define High Contrast CSS Variables

**File**: `apps/web/src/app/globals.css`

```css
:root {
  /* Base theme variables */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  /* ... other variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --border: 217.2 32.6% 17.5%;
  /* ... other variables */
}

/* High Contrast Mode */
.high-contrast,
:root[data-contrast="high"] {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --muted: 0 0% 10%;
  --muted-foreground: 0 0% 80%;
  --border: 0 0% 100%;
  --primary: 60 100% 50%;
  --primary-foreground: 0 0% 0%;
  --secondary: 0 0% 20%;
  --secondary-foreground: 0 0% 100%;
  --accent: 180 100% 50%;
  --accent-foreground: 0 0% 0%;
  --destructive: 0 100% 50%;
  --destructive-foreground: 0 0% 100%;
  --ring: 60 100% 50%;
}

.high-contrast.dark,
.dark[data-contrast="high"] {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 85%;
  --border: 0 0% 100%;
  --primary: 60 100% 50%;
  --primary-foreground: 0 0% 0%;
}

/* System high contrast preference */
@media (prefers-contrast: more) {
  :root:not([data-contrast="normal"]) {
    --border: 0 0% 0%;
    --ring: 0 0% 0%;
  }

  .dark:not([data-contrast="normal"]) {
    --border: 0 0% 100%;
    --ring: 0 0% 100%;
  }
}

/* Windows High Contrast Mode */
@media (forced-colors: active) {
  * {
    border-color: CanvasText !important;
  }

  .btn-primary {
    background-color: Highlight !important;
    color: HighlightText !important;
  }

  .btn-secondary {
    background-color: ButtonFace !important;
    color: ButtonText !important;
    border: 1px solid ButtonText !important;
  }

  :focus-visible {
    outline: 3px solid Highlight !important;
    outline-offset: 2px;
  }

  /* Ensure icons are visible */
  svg {
    fill: currentColor;
  }
}
```

### Step 2: Create Reduced Motion Styles

**File**: `apps/web/src/app/globals.css`

```css
/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Exceptions: Keep transforms for essential feedback */
  .essential-feedback {
    transition-duration: 150ms !important;
  }
}

/* App-level reduced motion toggle */
[data-reduced-motion="true"] {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Typing indicator - respect reduced motion */
.typing-indicator span {
  animation: typing-pulse 1500ms infinite;
}

@media (prefers-reduced-motion: reduce) {
  .typing-indicator span {
    animation: none;
    opacity: 0.6;
  }
}
```

### Step 3: Create Accessibility Hooks

**File**: `apps/web/src/hooks/usePrefersReducedMotion.ts`

```typescript
import { useState, useEffect } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
```

**File**: `apps/web/src/hooks/usePrefersContrast.ts`

```typescript
import { useState, useEffect } from 'react';

export function usePrefersContrast(): 'no-preference' | 'more' | 'less' {
  const [prefersContrast, setPrefersContrast] = useState<'no-preference' | 'more' | 'less'>('no-preference');

  useEffect(() => {
    const moreQuery = window.matchMedia('(prefers-contrast: more)');
    const lessQuery = window.matchMedia('(prefers-contrast: less)');

    const updatePreference = () => {
      if (moreQuery.matches) {
        setPrefersContrast('more');
      } else if (lessQuery.matches) {
        setPrefersContrast('less');
      } else {
        setPrefersContrast('no-preference');
      }
    };

    updatePreference();

    moreQuery.addEventListener('change', updatePreference);
    lessQuery.addEventListener('change', updatePreference);

    return () => {
      moreQuery.removeEventListener('change', updatePreference);
      lessQuery.removeEventListener('change', updatePreference);
    };
  }, []);

  return prefersContrast;
}
```

### Step 4: Create Visual Settings UI

**File**: `apps/web/src/components/settings/VisualAccessibilitySettings.tsx`

```typescript
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function VisualAccessibilitySettings() {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [textScale, setTextScale] = useState(100);

  // Load preferences from localStorage
  useEffect(() => {
    const savedContrast = localStorage.getItem('highContrast') === 'true';
    const savedMotion = localStorage.getItem('reducedMotion') === 'true';
    const savedScale = parseInt(localStorage.getItem('textScale') || '100', 10);

    setHighContrast(savedContrast);
    setReducedMotion(savedMotion);
    setTextScale(savedScale);

    // Apply to document
    document.documentElement.dataset.contrast = savedContrast ? 'high' : 'normal';
    document.documentElement.dataset.reducedMotion = String(savedMotion);
    document.documentElement.style.fontSize = `${savedScale}%`;
  }, []);

  const handleHighContrastChange = (enabled: boolean) => {
    setHighContrast(enabled);
    localStorage.setItem('highContrast', String(enabled));
    document.documentElement.dataset.contrast = enabled ? 'high' : 'normal';
  };

  const handleReducedMotionChange = (enabled: boolean) => {
    setReducedMotion(enabled);
    localStorage.setItem('reducedMotion', String(enabled));
    document.documentElement.dataset.reducedMotion = String(enabled);
  };

  const handleTextScaleChange = (value: number[]) => {
    const scale = value[0];
    setTextScale(scale);
    localStorage.setItem('textScale', String(scale));
    document.documentElement.style.fontSize = `${scale}%`;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Visual Accessibility</h3>

      {/* High Contrast */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="high-contrast">High contrast mode</Label>
          <p className="text-sm text-muted-foreground">
            Increase contrast for better visibility
          </p>
        </div>
        <Switch
          id="high-contrast"
          checked={highContrast}
          onCheckedChange={handleHighContrastChange}
        />
      </div>

      {/* Reduced Motion */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="reduced-motion">Reduce motion</Label>
          <p className="text-sm text-muted-foreground">
            Minimize animations and transitions
          </p>
        </div>
        <Switch
          id="reduced-motion"
          checked={reducedMotion}
          onCheckedChange={handleReducedMotionChange}
        />
      </div>

      {/* Text Scale */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Text size</Label>
          <span className="text-sm text-muted-foreground">{textScale}%</span>
        </div>
        <Slider
          value={[textScale]}
          onValueChange={handleTextScaleChange}
          min={75}
          max={200}
          step={25}
          aria-label="Text size"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Smaller</span>
          <span>Default</span>
          <span>Larger</span>
        </div>
      </div>

      {/* System Preferences Notice */}
      <div className="rounded-lg bg-muted p-4 text-sm">
        <p className="font-medium mb-1">System preferences</p>
        <p className="text-muted-foreground">
          These settings override system preferences. To use your system's
          accessibility settings, reset to defaults.
        </p>
        <button
          onClick={() => {
            handleHighContrastChange(false);
            handleReducedMotionChange(false);
            handleTextScaleChange([100]);
          }}
          className="mt-2 text-primary hover:underline"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
```

### Step 5: Fluid Typography for Text Scaling

**File**: `apps/web/src/app/globals.css`

```css
/* Fluid typography that scales properly */
:root {
  --text-xs: clamp(0.625rem, 0.6rem + 0.125vw, 0.75rem);
  --text-sm: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-base: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --text-lg: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-xl: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
}

/* Apply to body for inheritance */
body {
  font-size: var(--text-base);
  line-height: 1.6;
}

/* Ensure layouts don't break at 200% zoom */
.message-container {
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.sidebar {
  min-width: 0; /* Allow shrinking */
  width: clamp(200px, 25vw, 300px);
}

/* Text shouldn't overflow containers */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Step 6: Ensure Minimum Contrast Ratios

**File**: `apps/web/src/lib/utils/contrast.ts`

```typescript
/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA requirements
 */
export function meetsWcagAA(
  foreground: { r: number; g: number; b: number },
  background: { r: number; g: number; b: number },
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}
```

---

## Testing

### Manual Testing

1. Enable high contrast in settings
2. **Expected**: All text clearly visible, borders prominent
3. Enable reduced motion
4. **Expected**: No animations, smooth instant transitions
5. Scale text to 200%
6. **Expected**: Layout remains usable, no overflow
7. Test with Windows High Contrast Mode
8. **Expected**: Colors adapt to system theme

### Automated Testing

```typescript
describe('Visual Accessibility', () => {
  it('should apply high contrast class', () => {
    render(<VisualAccessibilitySettings />);

    const toggle = screen.getByRole('switch', { name: /high contrast/i });
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.contrast).toBe('high');
  });

  it('should apply reduced motion', () => {
    render(<VisualAccessibilitySettings />);

    const toggle = screen.getByRole('switch', { name: /reduce motion/i });
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.reducedMotion).toBe('true');
  });

  it('should scale text size', () => {
    render(<VisualAccessibilitySettings />);

    const slider = screen.getByRole('slider', { name: /text size/i });
    fireEvent.change(slider, { target: { value: 150 } });

    expect(document.documentElement.style.fontSize).toBe('150%');
  });
});

describe('Contrast Ratios', () => {
  it('should meet WCAG AA for text', () => {
    const foreground = { r: 0, g: 0, b: 0 };
    const background = { r: 255, g: 255, b: 255 };

    expect(meetsWcagAA(foreground, background)).toBe(true);
  });

  it('should detect insufficient contrast', () => {
    const foreground = { r: 150, g: 150, b: 150 };
    const background = { r: 255, g: 255, b: 255 };

    expect(meetsWcagAA(foreground, background)).toBe(false);
  });
});
```

### Color Contrast Checklist

| Element | Foreground | Background | Ratio | Status |
|---------|------------|------------|-------|--------|
| Body text | #0a0a0a | #ffffff | 21:1 | Pass |
| Muted text | #737373 | #ffffff | 4.6:1 | Pass |
| Primary button | #000000 | #ffff00 | 19.6:1 | Pass |
| Link text | #0066cc | #ffffff | 5.9:1 | Pass |
| Error text | #dc2626 | #ffffff | 4.5:1 | Pass |

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| WCAG 1.4.3 | Partial | Pass | Compliant |
| WCAG 1.4.11 | Fail | Pass | Compliant |
| WCAG 1.4.4 | Fail | Pass | 200% zoom |
| Users with low vision | Excluded | Supported | Inclusive |
| Windows HCM users | Broken | Works | Compatible |

---

## Risk Assessment

- **Breaking Changes**: None - additive CSS enhancement
- **Browser Support**: CSS custom properties 97%+, forced-colors 95%+
- **Performance Impact**: None - CSS only
- **Theme Conflicts**: Test with light/dark themes

---

## References

- **Sources**: claude/07-high-contrast-mode.md, claude/08-ui-scale-setting.md, claude/16-reduced-motion-support.md
- **WCAG 1.4.3**: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
- **forced-colors**: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
- **Related Issues**: P6-accessibility/01-semantic-html.md, P5-microinteractions/01-typing-indicator.md
