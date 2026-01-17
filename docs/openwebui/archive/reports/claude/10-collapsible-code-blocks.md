# Collapsible Code Blocks

> **Priority**: P2 (Polish)
> **Effort**: Medium (3-4 hours)
> **Impact**: Medium - Improves readability of long code in messages

---

## Summary

Add the ability to collapse long code blocks, showing only the first and last few lines with a "Show N hidden lines" indicator. This matches the Open WebUI pattern and improves readability when AI responses include lengthy code snippets.

---

## Current State

**File**: `apps/web/src/components/chat/CodeBlock.tsx`

### Current Behavior

- Code blocks render in full, regardless of length
- Max height: 600px with `overflow-y-auto`
- No collapse/expand functionality
- Copy and wrap toggle buttons available

```typescript
// Line ~114-116
<div className="[&>pre]:m-0 [&>pre]:p-4 [&>pre]:w-full [&>pre]:overflow-x-auto max-h-[600px] overflow-y-auto">
  {/* Full code rendered */}
</div>
```

### Problem Scenarios

1. **Long code response**: AI generates 200+ lines, dominates conversation
2. **Multiple code blocks**: Several long snippets make scrolling tedious
3. **Quick scanning**: User wants to see conversation flow, not read every line

---

## Solution

### Design

**Collapsed state:**
```
┌─────────────────────────────────┐
│ typescript                [Copy]│
├─────────────────────────────────┤
│ function processData() {        │
│   const result = [];            │
│   ...                           │
│ ─────── 47 hidden lines ─────── │
│   return result;                │
│ }                               │
└─────────────────────────────────┘
```

**Expanded state:**
```
┌─────────────────────────────────┐
│ typescript         [Collapse] [Copy]│
├─────────────────────────────────┤
│ function processData() {        │
│   const result = [];            │
│   for (const item of items) {   │
│     ...                         │
│   }                             │
│   return result;                │
│ }                               │
└─────────────────────────────────┘
```

### Implementation

**File**: `apps/web/src/components/chat/CodeBlock.tsx`

```typescript
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COLLAPSE_THRESHOLD = 15; // Lines before collapsing
const VISIBLE_LINES_TOP = 5;   // Lines shown at top when collapsed
const VISIBLE_LINES_BOTTOM = 3; // Lines shown at bottom when collapsed

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => code.split('\n'), [code]);
  const shouldCollapse = lines.length > COLLAPSE_THRESHOLD;
  const hiddenCount = lines.length - VISIBLE_LINES_TOP - VISIBLE_LINES_BOTTOM;

  const displayCode = useMemo(() => {
    if (!shouldCollapse || !isCollapsed) {
      return code;
    }

    const topLines = lines.slice(0, VISIBLE_LINES_TOP);
    const bottomLines = lines.slice(-VISIBLE_LINES_BOTTOM);

    return topLines.join('\n');
  }, [code, lines, shouldCollapse, isCollapsed]);

  const bottomCode = useMemo(() => {
    if (!shouldCollapse || !isCollapsed) return null;
    return lines.slice(-VISIBLE_LINES_BOTTOM).join('\n');
  }, [lines, shouldCollapse, isCollapsed]);

  return (
    <div className="relative group rounded-lg border overflow-hidden">
      {/* Header with language and controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <span className="text-xs text-muted-foreground font-mono">
          {language || 'text'}
        </span>
        <div className="flex items-center gap-2">
          {shouldCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-6 px-2 text-xs"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Expand
                </>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Collapse
                </>
              )}
            </Button>
          )}
          <CopyButton code={code} />
        </div>
      </div>

      {/* Code content */}
      <div className="relative">
        {/* Top portion */}
        <pre className="p-4 overflow-x-auto">
          <code dangerouslySetInnerHTML={{ __html: highlightCode(displayCode, language) }} />
        </pre>

        {/* Hidden lines indicator */}
        {shouldCollapse && isCollapsed && (
          <>
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-full py-2 flex items-center justify-center gap-2
                         bg-muted/30 hover:bg-muted/50 transition-colors
                         text-xs text-muted-foreground border-y border-dashed"
            >
              <span className="border-t border-dashed border-muted-foreground/50 w-8" />
              <span>{hiddenCount} hidden lines</span>
              <span className="border-t border-dashed border-muted-foreground/50 w-8" />
            </button>

            {/* Bottom portion */}
            <pre className="p-4 pt-0 overflow-x-auto">
              <code dangerouslySetInnerHTML={{ __html: highlightCode(bottomCode!, language) }} />
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
```

### User Preference (Optional)

Allow users to set default collapse behavior:

```typescript
// In settings
const [alwaysCollapseCode, setAlwaysCollapseCode] = useUserPreference(
  'alwaysCollapseCode',
  true // Default to collapsed
);

// In CodeBlock
const [isCollapsed, setIsCollapsed] = useState(alwaysCollapseCode);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/components/chat/CodeBlock.tsx` | Add collapse logic |
| `apps/web/src/app/(main)/settings/appearance/page.tsx` | Optional: default collapse preference |

---

## Testing

### Manual Testing

1. Generate a response with a long code block (20+ lines)
2. **Expected**: Code block shows collapsed with "N hidden lines"
3. Click expand button
4. **Expected**: Full code visible
5. Click collapse button
6. **Expected**: Returns to collapsed state

### Edge Cases

- [ ] Very short code (< 15 lines) - should NOT show collapse
- [ ] Exactly threshold lines (15) - should NOT collapse
- [ ] Code with only top content interesting (function signature)
- [ ] Code with syntax highlighting - should work when collapsed
- [ ] Copy button - should copy FULL code even when collapsed
- [ ] Multiple code blocks in one message

### Visual Testing

```typescript
// Test with various lengths
const shortCode = `console.log("hello");`; // No collapse
const mediumCode = Array(16).fill('line').join('\n'); // Just over threshold
const longCode = Array(100).fill('line').join('\n'); // Definitely collapsed
```

---

## References

### Open WebUI Pattern

```svelte
<!-- From Open WebUI CodeBlock.svelte -->
{#if lines.length > threshold}
  <button on:click={() => collapsed = !collapsed}>
    {collapsed ? `Show ${hiddenCount} hidden lines` : 'Collapse'}
  </button>
{/if}
```

### Animation (Optional Enhancement)

```css
/* Smooth expand/collapse */
.code-content {
  transition: max-height 0.3s ease-out;
  overflow: hidden;
}

.code-content.collapsed {
  max-height: 200px; /* Approximate height of visible lines */
}

.code-content.expanded {
  max-height: 2000px; /* Large enough for most code */
}
```

---

## Notes

- **Copy always copies full code** - even when collapsed
- **Default to collapsed** - users can expand if interested
- **Threshold is configurable** - 15 lines is a reasonable default
- **Don't collapse in edit mode** - if editing code, show full
- **Syntax highlighting should work** - highlight visible portions
- **Consider line numbers** - if adding, they should reflect actual line numbers
