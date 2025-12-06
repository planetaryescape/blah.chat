# Quick Wins: High-Impact UX Improvements

## Context

### Analysis from t3.chat
t3.chat excels at **immediate usability** through:
- Visible keyboard hints in input area ("Press Enter to send, Shift + Enter for new line")
- Clear feature availability indicators
- Minimal friction to first interaction
- Clean, uncluttered interface

### Current State of blah.chat

**Strengths:**
- Polished animations (Framer Motion)
- Glassmorphic design
- Resilient generation
- Advanced features (comparison mode, voice, images)

**Gaps Identified:**
1. **No autofocus** - User must click input to start typing
2. **Keyboard hints hidden** - Shortcuts exist (`⌘K`, `⌘N`, `⌘M`) but users don't know about them
3. **No shortcut badges** - Buttons lack visual cues for keyboard users
4. **Generic placeholder** - "Message blah.chat..." doesn't hint at features

### User Impact
- **Friction on first use** - Extra click required to focus input
- **Missed shortcuts** - Power users don't discover keyboard efficiency
- **Feature discovery** - Users unaware of voice, images, comparison mode

---

## Requirements

Implement 4 quick wins:

1. **Autofocus Input** - Focus textarea when conversation loads with no messages
2. **Enhanced Keyboard Hints** - Dynamic hints showing relevant shortcuts
3. **Shortcut Badges** - Visual indicators on buttons (⌘N, ⌘K, etc.)
4. **Feature Hints** - Update placeholder to mention capabilities

---

## Technical Approach

### 1. Autofocus Input on Empty State

**File:** `src/components/chat/ChatInput.tsx`

**Current Code** (line ~280-300):
```typescript
export function ChatInput({ conversationId }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messages = useQuery(api.messages.list, { conversationId });

  // ... existing code
}
```

**Add this effect:**
```typescript
// Add after existing useEffect hooks
useEffect(() => {
  // Only autofocus if no messages (empty state)
  if (messages && messages.length === 0 && textareaRef.current) {
    // Delay slightly for smooth page load
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 300);

    return () => clearTimeout(timer);
  }
}, [messages]);
```

**Mobile Consideration:**
```typescript
// Detect mobile to avoid auto-opening keyboard
const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

useEffect(() => {
  if (messages && messages.length === 0 && textareaRef.current && !isMobile) {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }
}, [messages, isMobile]);
```

---

### 2. Enhanced Keyboard Hints

**File:** `src/components/chat/ChatInput.tsx`

**Current Code** (line ~350-352):
```typescript
<div className="text-[10px] text-muted-foreground/50 font-medium tracking-wide">
  Shift + Enter for new line
</div>
```

**Replace with dynamic hints:**
```typescript
<div
  className="text-[10px] text-muted-foreground/50 font-medium tracking-wide transition-opacity"
  role="status"
  aria-live="polite"
>
  {input.trim() ? (
    <>
      <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono">
        Enter
      </kbd>{" "}
      to send ·{" "}
      <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono">
        Shift+Enter
      </kbd>{" "}
      new line
    </>
  ) : (
    <>
      <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono">
        ⌘K
      </kbd>{" "}
      commands ·{" "}
      <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono">
        ⌘M
      </kbd>{" "}
      models ·{" "}
      <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono">
        ⌘N
      </kbd>{" "}
      new chat
    </>
  )}
</div>
```

**Styling for `<kbd>` tags** (add to `globals.css` if needed):
```css
kbd {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-jetbrains), monospace;
  font-size: 0.75rem;
}
```

---

### 3. Shortcut Badges on Buttons

**Create new component:** `src/components/ui/shortcut-badge.tsx`

```typescript
import { type ReactNode } from "react";

export interface ShortcutBadgeProps {
  shortcut: string;
  children: ReactNode;
  className?: string;
}

export function ShortcutBadge({
  shortcut,
  children,
  className
}: ShortcutBadgeProps) {
  return (
    <div className={`flex items-center justify-between gap-2 w-full ${className || ""}`}>
      <span className="flex items-center gap-2">
        {children}
      </span>
      <kbd
        className="hidden sm:inline-flex h-5 px-1.5 rounded border border-border/50 bg-background/50 font-mono text-[10px] text-muted-foreground"
        aria-hidden="true"
      >
        {shortcut}
      </kbd>
    </div>
  );
}

// Platform-specific shortcut display
export function getShortcutDisplay(shortcut: string): string {
  const isMac = typeof window !== "undefined" &&
                navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  return isMac
    ? shortcut.replace("Ctrl", "⌘").replace("Control", "⌘")
    : shortcut.replace("⌘", "Ctrl");
}
```

**Usage in `src/components/sidebar/app-sidebar.tsx`** (line ~71):

**Before:**
```typescript
<Button onClick={handleNewChat} className="w-full gap-2">
  <Plus className="w-4 h-4" />
  New Chat
</Button>
```

**After:**
```typescript
import { ShortcutBadge } from "@/components/ui/shortcut-badge";

<Button onClick={handleNewChat} className="w-full">
  <ShortcutBadge shortcut="⌘N">
    <Plus className="w-4 h-4" />
    New Chat
  </ShortcutBadge>
</Button>
```

**Add to other buttons:**
- Settings button: `⌘,`
- Search: `⌘F`
- Command Palette trigger: `⌘K`

---

### 4. Feature Hints in Placeholder

**File:** `src/components/chat/ChatInput.tsx`

**Current placeholder** (line ~290):
```typescript
placeholder="Message blah.chat..."
```

**Enhanced placeholder with dynamic features:**
```typescript
const getPlaceholder = () => {
  const features = [];

  if (selectedModel) {
    const modelConfig = getModelConfig(selectedModel);

    if (modelConfig?.capabilities?.includes("vision")) {
      features.push("images");
    }
    if (modelConfig?.supportsThinkingEffort) {
      features.push("reasoning");
    }
  }

  if (features.length > 0) {
    return `Message blah.chat (${features.join(", ")} supported)...`;
  }

  return "Message blah.chat (⌘K for shortcuts)...";
};

// In textarea:
<Textarea
  ref={textareaRef}
  placeholder={getPlaceholder()}
  // ... rest of props
/>
```

---

## Design Specs

### Visual Hierarchy
- Keyboard hints: `10px`, uppercase tracking, `muted-foreground/50`
- `<kbd>` tags: subtle border, rounded corners, monospace font
- Shortcut badges: right-aligned in buttons, hidden on mobile (`sm:inline-flex`)

### Animations
- Hints change: fade opacity transition (150ms)
- Autofocus: smooth with 300ms delay
- Badge hover: subtle scale (optional)

### Typography
- Hints: JetBrains Mono (monospace)
- Badges: 10px, letter-spacing: 0.05em

### Colors
- Border: `border/30` for kbd tags
- Background: `background/50` for kbd tags
- Text: `muted-foreground` for badges

---

## Accessibility Requirements

### ARIA Attributes

**Keyboard hints:**
```typescript
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {/* hint content */}
</div>
```

**Shortcut badges:**
```typescript
<kbd aria-hidden="true">
  {shortcut}
</kbd>
```
- Badges are decorative - real functionality comes from JS event handlers
- Screen readers announce actions via button labels, not badges

**Textarea:**
```typescript
<Textarea
  ref={textareaRef}
  aria-label="Message input"
  aria-describedby="input-hint"
  // ... props
/>
```

**Hint container:**
```typescript
<div id="input-hint" className="...">
  {/* hints */}
</div>
```

---

## Edge Cases

### 1. Mobile Devices
**Problem:** Autofocus triggers keyboard on mobile
**Solution:** Detect screen width, skip autofocus if < 768px

```typescript
const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
if (!isMobile) {
  textareaRef.current?.focus();
}
```

### 2. Navigation from Sidebar
**Problem:** User clicks conversation, input should refocus
**Solution:** Track `conversationId` in dependency array

```typescript
useEffect(() => {
  if (messages?.length === 0 && !isMobile) {
    textareaRef.current?.focus();
  }
}, [messages, conversationId]); // conversationId triggers refocus on change
```

### 3. Very Long Input
**Problem:** Keyboard hints might overflow
**Solution:** Use `text-xs` and `truncate` if needed

```typescript
<div className="text-[10px] truncate max-w-full">
  {/* hints */}
</div>
```

### 4. Touch Devices
**Problem:** Keyboard shortcuts not applicable
**Solution:** Hide shortcut badges on touch devices

```typescript
const isTouchDevice = typeof window !== "undefined" &&
                      "ontouchstart" in window;

{!isTouchDevice && (
  <ShortcutBadge shortcut="⌘N">New Chat</ShortcutBadge>
)}
```

### 5. Platform Differences
**Problem:** Windows/Linux use Ctrl, macOS uses ⌘
**Solution:** Detect platform, show correct modifier

```typescript
const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modifier = isMac ? "⌘" : "Ctrl";

<kbd>{modifier}K</kbd>
```

---

## Testing Checklist

### Autofocus
- [ ] Load new conversation → input focused after 300ms
- [ ] Navigate to existing conversation → input NOT focused
- [ ] Return to empty conversation → input refocused
- [ ] Mobile (< 768px) → input NOT autofocused
- [ ] Keyboard navigation (Tab) → focus preserved

### Keyboard Hints
- [ ] Empty input → shows `⌘K`, `⌘M`, `⌘N` hints
- [ ] Type text → hints change to `Enter` / `Shift+Enter`
- [ ] Clear input → hints revert to shortcuts
- [ ] Screen reader → announces hint changes
- [ ] Mobile → hints still visible (shortcuts hidden via badges)

### Shortcut Badges
- [ ] Desktop → badges visible on New Chat, Settings, etc.
- [ ] Mobile (< 640px) → badges hidden (`sm:inline-flex`)
- [ ] macOS → shows `⌘` symbol
- [ ] Windows/Linux → shows `Ctrl`
- [ ] Hover → no layout shift (badges right-aligned)

### Feature Hints
- [ ] Vision model selected → placeholder mentions "images"
- [ ] Thinking model → placeholder mentions "reasoning"
- [ ] Standard model → placeholder shows "⌘K for shortcuts"
- [ ] Model change → placeholder updates immediately

### Cross-browser
- [ ] Chrome → all features work
- [ ] Firefox → kbd tags styled correctly
- [ ] Safari → autofocus works (with setTimeout fallback)
- [ ] Edge → shortcuts display correctly

### Accessibility
- [ ] Screen reader announces hint changes
- [ ] Keyboard navigation → focus visible
- [ ] High contrast mode → kbd borders visible
- [ ] No JS → basic input still functional

---

## Critical Files to Modify

1. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ChatInput.tsx`**
   - Add autofocus effect (line ~280-300)
   - Replace keyboard hint (line ~350-352)
   - Add dynamic placeholder function

2. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/components/ui/shortcut-badge.tsx`** (NEW)
   - Create ShortcutBadge component
   - Export getShortcutDisplay utility

3. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/components/sidebar/app-sidebar.tsx`**
   - Wrap New Chat button in ShortcutBadge (line ~71)
   - Add badges to Settings, Search buttons

4. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/app/globals.css`** (optional)
   - Add kbd tag styling if needed

---

## Code Examples

### Complete ChatInput Effect
```typescript
// Add to ChatInput.tsx after existing hooks

import { useEffect, useRef, useState } from "react";

export function ChatInput({ conversationId }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messages = useQuery(api.messages.list, { conversationId });
  const [isMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768
  );

  // Autofocus on empty state
  useEffect(() => {
    if (messages && messages.length === 0 && !isMobile) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [messages, conversationId, isMobile]);

  // ... rest of component
}
```

### Complete Keyboard Hint Component
```typescript
function KeyboardHint({ hasInput }: { hasInput: boolean }) {
  const isMac = typeof navigator !== "undefined" &&
                navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmd = isMac ? "⌘" : "Ctrl";

  return (
    <div
      className="text-[10px] text-muted-foreground/50 font-medium tracking-wide"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {hasInput ? (
        <>
          <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono">
            Enter
          </kbd>{" "}
          to send ·{" "}
          <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono">
            Shift+Enter
          </kbd>{" "}
          new line
        </>
      ) : (
        <>
          <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono">
            {cmd}K
          </kbd>{" "}
          commands ·{" "}
          <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono">
            {cmd}M
          </kbd>{" "}
          models ·{" "}
          <kbd className="px-1 py-0.5 rounded border border-border/30 bg-background/50 font-mono">
            {cmd}N
          </kbd>{" "}
          new chat
        </>
      )}
    </div>
  );
}

// Usage in ChatInput:
<KeyboardHint hasInput={input.trim().length > 0} />
```

---

## Success Metrics

**Before:**
- ~3 clicks to start chatting (open app → click input → type)
- ~10% users discover shortcuts
- Generic experience regardless of model

**After:**
- ~1 click to start chatting (open app → type immediately)
- ~60% users see and learn shortcuts
- Contextual hints guide feature discovery

---

## Implementation Time

**Estimated:** 2-3 hours

**Breakdown:**
- Autofocus implementation: 30 min
- Keyboard hints enhancement: 45 min
- ShortcutBadge component + integration: 60 min
- Feature hints in placeholder: 30 min
- Testing & polish: 30 min

---

## Dependencies

- None - all changes self-contained
- Uses existing hooks (`useQuery`, `useRef`, `useEffect`)
- Uses existing UI components (Button, Textarea)
- Can implement independently of other improvements

---

## Related Improvements

- **04-discoverability.md** - Onboarding tour will explain shortcuts
- **07-accessibility.md** - ARIA requirements already included here
- **05-model-prominence.md** - Feature hints will sync with model display

---

## Notes

- Maintain glassmorphic aesthetic - kbd tags use subtle borders/backgrounds
- Preserve existing animations - hints should fade smoothly
- Mobile-first approach - ensure no keyboard issues on touch devices
- Platform detection critical - show correct modifier keys (⌘ vs Ctrl)
