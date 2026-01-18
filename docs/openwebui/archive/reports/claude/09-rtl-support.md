# RTL (Right-to-Left) Support

> **Priority**: P2 (Accessibility/Internationalization)
> **Effort**: Medium (4-6 hours)
> **Impact**: Low-Medium - Required for Arabic, Hebrew, Persian users

---

## Summary

Add support for right-to-left text direction with a user toggle (auto/LTR/RTL). This enables proper display of Arabic, Hebrew, Persian, and other RTL languages.

---

## Current State

**Status**: Not implemented

The app assumes left-to-right layout throughout:
- CSS uses physical properties (`margin-left`, `padding-right`)
- No `dir` attribute handling
- No RTL text rendering consideration

---

## Problem

### Why RTL Matters

1. **Market Reach**: 400+ million Arabic speakers, plus Hebrew, Persian, Urdu
2. **Usability**: Text alignment, UI layout must mirror for readability
3. **Professionalism**: RTL support signals a mature, global product
4. **AI Responses**: AI may respond in RTL languages based on user input

### What Needs to Change

| Element | LTR | RTL |
|---------|-----|-----|
| Message alignment | User right, AI left | User left, AI right |
| Sidebar | Left | Right |
| Icons | Left-pointing arrows | Right-pointing arrows |
| Text alignment | Left | Right |
| Scrollbars | Right | Left |

### What Open WebUI Does

```javascript
// From Open WebUI Settings/Interface.svelte
// Chat Direction: auto / LTR / RTL dropdown
<select bind:value={settings.chatDirection}>
  <option value="auto">Auto</option>
  <option value="ltr">LTR</option>
  <option value="rtl">RTL</option>
</select>
```

---

## Solution

### 1. Add Direction Setting

**File**: `apps/web/src/app/(main)/settings/appearance/page.tsx`

```typescript
type TextDirection = 'auto' | 'ltr' | 'rtl';

export default function AppearanceSettings() {
  const [textDirection, setTextDirection] = useUserPreference<TextDirection>(
    'textDirection',
    'auto'
  );

  useEffect(() => {
    document.documentElement.dir = textDirection === 'auto' ? '' : textDirection;
    document.documentElement.setAttribute('data-direction', textDirection);
  }, [textDirection]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="text-direction">Chat Direction</Label>
        <Select value={textDirection} onValueChange={setTextDirection}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-detect</SelectItem>
            <SelectItem value="ltr">Left to Right</SelectItem>
            <SelectItem value="rtl">Right to Left</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Control text and UI direction for RTL languages
        </p>
      </div>
    </div>
  );
}
```

### 2. Use CSS Logical Properties

Replace physical properties with logical equivalents:

**File**: Various CSS files and components

```css
/* BEFORE: Physical properties (LTR-only) */
.message-user {
  margin-left: auto;
  margin-right: 1rem;
  text-align: right;
}

.sidebar {
  border-right: 1px solid var(--border);
  padding-left: 1rem;
}

/* AFTER: Logical properties (RTL-aware) */
.message-user {
  margin-inline-start: auto;
  margin-inline-end: 1rem;
  text-align: end;
}

.sidebar {
  border-inline-end: 1px solid var(--border);
  padding-inline-start: 1rem;
}
```

### Logical Property Reference

| Physical | Logical | LTR Result | RTL Result |
|----------|---------|------------|------------|
| `left` | `inline-start` | left | right |
| `right` | `inline-end` | right | left |
| `margin-left` | `margin-inline-start` | margin-left | margin-right |
| `padding-right` | `padding-inline-end` | padding-right | padding-left |
| `border-left` | `border-inline-start` | border-left | border-right |
| `text-align: left` | `text-align: start` | left | right |
| `float: right` | `float: inline-end` | right | left |

### 3. Update Key Components

**Message Bubbles:**

```css
/* apps/web/src/components/chat/ChatMessage.tsx */
.message-user {
  margin-inline-start: auto; /* Pushes to end (right in LTR, left in RTL) */
}

.message-assistant {
  margin-inline-end: auto; /* Pushes to start */
}
```

**Sidebar:**

```css
/* apps/web/src/components/sidebar/Sidebar.tsx */
.sidebar {
  border-inline-end: 1px solid var(--border);
  /* Other properties using logical equivalents */
}

[dir="rtl"] .sidebar {
  /* Sidebar appears on right side */
}
```

**Icons that indicate direction:**

```tsx
// Icons that need to flip
import { ChevronLeft, ChevronRight } from 'lucide-react';

function DirectionalIcon() {
  const isRTL = document.documentElement.dir === 'rtl';
  return isRTL ? <ChevronRight /> : <ChevronLeft />;
}

// Or use CSS
.rtl-flip {
  transform: scaleX(1);
}
[dir="rtl"] .rtl-flip {
  transform: scaleX(-1);
}
```

### 4. Auto-Detection Logic

For `auto` mode, detect text direction from content:

```typescript
// apps/web/src/lib/utils/textDirection.ts

const RTL_CHARS = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

export function detectTextDirection(text: string): 'ltr' | 'rtl' {
  // Check first strong directional character
  const firstChar = text.match(/[\p{L}\p{N}]/u)?.[0];
  if (firstChar && RTL_CHARS.test(firstChar)) {
    return 'rtl';
  }
  return 'ltr';
}

// Usage in message component
<div dir={detectTextDirection(message.content)}>
  {message.content}
</div>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/app/globals.css` | Add RTL-specific overrides |
| `apps/web/src/app/(main)/settings/appearance/page.tsx` | Add direction toggle |
| `apps/web/src/components/chat/ChatMessage.tsx` | Logical properties + dir attr |
| `apps/web/src/components/sidebar/*.tsx` | Logical properties |
| `apps/web/src/styles/prose.css` | Logical properties for typography |
| `tailwind.config.ts` | Add RTL variant if using Tailwind |

---

## Testing

### Manual Testing

1. Set direction to RTL in settings
2. Verify:
   - Messages flip sides (user messages on left, AI on right)
   - Sidebar moves to right side
   - Text aligns to the right
   - Directional icons flip
3. Type Arabic text: should render correctly
4. Mix LTR and RTL content in same message

### Test Content

```
English: Hello, how are you?
Arabic: مرحبا، كيف حالك؟
Hebrew: שלום, מה שלומך?
Mixed: Hello مرحبا world عالم
```

### Browser Testing

Test in:
- Chrome (uses `dir` attribute correctly)
- Safari (may need `-webkit-` prefixes for some properties)
- Firefox (good RTL support)

### Checklist

- [ ] Message bubbles flip correctly
- [ ] Sidebar appears on correct side
- [ ] Input area aligns correctly
- [ ] Scrollbar position changes
- [ ] Icons that indicate direction flip
- [ ] Mixed content (LTR in RTL message) renders correctly
- [ ] Code blocks remain LTR (code is always LTR)

---

## References

### CSS Logical Properties (MDN)

```css
/* Full list of logical property equivalents */
margin-inline-start, margin-inline-end
margin-block-start, margin-block-end
padding-inline-start, padding-inline-end
border-inline-start, border-inline-end
inset-inline-start, inset-inline-end (for positioning)
```

### Tailwind RTL Plugin

```javascript
// tailwind.config.ts
module.exports = {
  plugins: [
    require('tailwindcss-rtl'),
  ],
}

// Usage
<div className="ms-4 me-2"> {/* margin-inline-start/end */}
```

### HTML dir Attribute

```html
<!-- Document level -->
<html dir="rtl">

<!-- Element level (for mixed content) -->
<p dir="ltr">English text</p>
<p dir="rtl">النص العربي</p>

<!-- Auto-detect -->
<p dir="auto">Mixed مختلط content</p>
```

---

## Notes

- **Code blocks always LTR** - programming languages are left-to-right
- **Numbers may need special handling** - Arabic uses different numerals
- **Don't flip ALL icons** - only directional ones (arrows, chevrons)
- **Test with native speakers** if possible
- **Consider bidirectional text** - sentences with both LTR and RTL words
