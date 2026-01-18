# RTL (Right-to-Left) Support

> **Phase**: P9-features | **Effort**: 4h | **Impact**: 400M+ Arabic speakers supported
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

The app assumes left-to-right layout throughout, making it unusable for Arabic, Hebrew, Persian, and Urdu speakers. Text alignment, UI layout, and directional icons are all incorrect for RTL languages. AI may respond in RTL languages based on user input, but rendering is broken.

### Current Behavior

- CSS uses physical properties (`margin-left`, `padding-right`)
- No `dir` attribute handling
- Messages always aligned for LTR
- Sidebar always on left
- Directional icons don't flip

### Expected Behavior

- User toggle: Auto / LTR / RTL in settings
- Messages flip sides correctly (user on left in RTL)
- Sidebar moves to right in RTL
- Directional icons flip
- Code blocks remain LTR (code is always LTR)

---

## Current Implementation

No RTL support. All styles use physical CSS properties.

---

## Solution

Replace physical CSS properties with logical equivalents and add direction setting.

### Step 1: Add Direction Setting

**File**: `apps/web/src/app/(main)/settings/appearance/page.tsx`

```typescript
import { useUserPreference } from '@/hooks/useUserPreference';
import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TextDirection = 'auto' | 'ltr' | 'rtl';

export function DirectionSetting() {
  const [textDirection, setTextDirection] = useUserPreference<TextDirection>(
    'textDirection',
    'auto'
  );

  useEffect(() => {
    // Set document direction
    if (textDirection === 'auto') {
      document.documentElement.removeAttribute('dir');
    } else {
      document.documentElement.dir = textDirection;
    }
    document.documentElement.setAttribute('data-direction', textDirection);
  }, [textDirection]);

  return (
    <div className="space-y-2">
      <Label htmlFor="text-direction">Chat Direction</Label>
      <Select
        value={textDirection}
        onValueChange={(v) => setTextDirection(v as TextDirection)}
      >
        <SelectTrigger id="text-direction">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Auto-detect</SelectItem>
          <SelectItem value="ltr">Left to Right</SelectItem>
          <SelectItem value="rtl">Right to Left</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Control text and UI direction for RTL languages (Arabic, Hebrew, etc.)
      </p>
    </div>
  );
}
```

### Step 2: Auto-Detection Utility

**File**: `apps/web/src/lib/utils/textDirection.ts`

```typescript
// RTL character ranges (Arabic, Hebrew, Persian, etc.)
const RTL_CHARS = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

/**
 * Detect text direction from content
 */
export function detectTextDirection(text: string): 'ltr' | 'rtl' {
  // Find first strong directional character
  const match = text.match(/[\p{L}\p{N}]/u);
  const firstChar = match?.[0];

  if (firstChar && RTL_CHARS.test(firstChar)) {
    return 'rtl';
  }
  return 'ltr';
}

/**
 * Check if text contains RTL characters
 */
export function containsRTL(text: string): boolean {
  return RTL_CHARS.test(text);
}
```

### Step 3: Update CSS to Logical Properties

Replace physical properties with logical equivalents throughout the codebase:

**File**: `apps/web/src/styles/globals.css`

```css
/* CONVERSION REFERENCE:
 * margin-left    → margin-inline-start
 * margin-right   → margin-inline-end
 * padding-left   → padding-inline-start
 * padding-right  → padding-inline-end
 * border-left    → border-inline-start
 * border-right   → border-inline-end
 * left           → inset-inline-start
 * right          → inset-inline-end
 * text-align: left → text-align: start
 * text-align: right → text-align: end
 */

/* Message alignment */
.message-user {
  margin-inline-start: auto;
  margin-inline-end: 1rem;
}

.message-assistant {
  margin-inline-end: auto;
  margin-inline-start: 1rem;
}

/* Sidebar */
.sidebar {
  border-inline-end: 1px solid hsl(var(--border));
  padding-inline-start: 0.5rem;
}

/* RTL-specific overrides */
[dir='rtl'] .sidebar {
  /* Sidebar on right in RTL */
  order: 1;
}

/* Code blocks always LTR */
pre,
code,
.code-block {
  direction: ltr;
  text-align: left;
}
```

### Step 4: Directional Icon Component

**File**: `apps/web/src/components/ui/directional-icon.tsx`

```typescript
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Direction = 'start' | 'end';

interface DirectionalIconProps {
  direction: Direction;
  type?: 'chevron' | 'arrow';
  className?: string;
}

const iconMap: Record<'chevron' | 'arrow', Record<'ltr' | 'rtl', Record<Direction, LucideIcon>>> = {
  chevron: {
    ltr: { start: ChevronLeft, end: ChevronRight },
    rtl: { start: ChevronRight, end: ChevronLeft },
  },
  arrow: {
    ltr: { start: ArrowLeft, end: ArrowRight },
    rtl: { start: ArrowRight, end: ArrowLeft },
  },
};

export function DirectionalIcon({
  direction,
  type = 'chevron',
  className,
}: DirectionalIconProps) {
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    const checkRTL = () => {
      setIsRTL(document.documentElement.dir === 'rtl');
    };

    checkRTL();

    // Watch for direction changes
    const observer = new MutationObserver(checkRTL);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir'],
    });

    return () => observer.disconnect();
  }, []);

  const dir = isRTL ? 'rtl' : 'ltr';
  const Icon = iconMap[type][dir][direction];

  return <Icon className={className} />;
}

// CSS-only alternative
export function RTLFlipIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-block rtl:scale-x-[-1]', className)}>
      {children}
    </span>
  );
}
```

### Step 5: Message Component with Direction

**File**: `apps/web/src/components/chat/ChatMessage.tsx`

```typescript
import { detectTextDirection } from '@/lib/utils/textDirection';

function ChatMessage({ message }: { message: Message }) {
  // Auto-detect content direction
  const contentDirection = detectTextDirection(message.content);

  return (
    <div
      className={cn(
        'message',
        message.role === 'user' ? 'message-user' : 'message-assistant'
      )}
    >
      <div
        dir={contentDirection}
        className="message-content prose dark:prose-invert"
      >
        {message.content}
      </div>
    </div>
  );
}
```

### Step 6: Tailwind RTL Plugin (Optional)

**File**: `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  // ... other config
  plugins: [
    // RTL variant plugin
    function ({ addVariant }) {
      addVariant('rtl', '[dir="rtl"] &');
      addVariant('ltr', '[dir="ltr"] &');
    },
  ],
};

// Usage in components:
// className="ms-4 rtl:me-4"  // margin-start, reversed in RTL
// className="text-start rtl:text-end"
```

---

## Testing

### Manual Testing

1. Set direction to RTL in settings
2. Verify:
   - Messages flip sides (user messages on left, AI on right)
   - Sidebar moves to right side
   - Text aligns to the right
   - Directional icons flip
3. Type Arabic text: `مرحبا، كيف حالك؟`
4. Type Hebrew text: `שלום, מה שלומך?`
5. Mix LTR and RTL: `Hello مرحبا world`

### Test Content

```
English: Hello, how are you?
Arabic: مرحبا، كيف حالك؟
Hebrew: שלום, מה שלומך?
Persian: سلام، حالت چطوره؟
Mixed: Hello مرحبا world عالم
```

### Unit Tests

```typescript
describe('detectTextDirection', () => {
  it('detects LTR text', () => {
    expect(detectTextDirection('Hello world')).toBe('ltr');
  });

  it('detects Arabic RTL text', () => {
    expect(detectTextDirection('مرحبا')).toBe('rtl');
  });

  it('detects Hebrew RTL text', () => {
    expect(detectTextDirection('שלום')).toBe('rtl');
  });

  it('detects direction from first strong character in mixed text', () => {
    expect(detectTextDirection('Hello مرحبا')).toBe('ltr');
    expect(detectTextDirection('مرحبا Hello')).toBe('rtl');
  });
});
```

### Visual Checklist

- [ ] Message bubbles flip correctly
- [ ] Sidebar appears on correct side
- [ ] Input area aligns correctly
- [ ] Scrollbar position changes
- [ ] Icons that indicate direction flip
- [ ] Mixed content renders correctly
- [ ] Code blocks remain LTR

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| RTL language support | 0% | 100% | Full support |
| Market reach | Limited | +400M speakers | Significant |
| UI consistency in RTL | Broken | Correct | Complete |
| Mixed content handling | None | Auto-detect | Smart |

---

## Risk Assessment

- **Risk Level**: LOW
- **Breaking Changes**: None (opt-in feature)
- **Browser Support**: 95%+ (logical properties well supported)
- **Testing Required**: High (visual testing needed)
- **Notes**: Code blocks should always stay LTR

---

## References

- **Sources**: claude/09-rtl-support.md
- **CSS Logical Properties**: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties
- **Tailwind RTL**: https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support
- **Related Issues**: P6-accessibility/01-semantic-html.md
