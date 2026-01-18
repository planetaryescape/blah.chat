# Collapsible Code Blocks

> **Phase**: P9-features | **Effort**: 3h | **Impact**: Improved readability for long code
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

AI responses often include long code blocks (100+ lines) that dominate the conversation view. Users must scroll through lengthy code to see the rest of the conversation. This makes it hard to scan the conversation flow and creates visual noise when the user only needs a quick overview.

### Current Behavior

- Code blocks render in full, regardless of length
- Max height: 600px with `overflow-y-auto`
- No collapse/expand functionality
- Long code blocks dominate conversation

### Expected Behavior

- Code blocks > 15 lines automatically collapse
- Show first 5 lines + last 3 lines when collapsed
- "Show N hidden lines" indicator
- Expand/collapse toggle
- Copy button copies FULL code (even when collapsed)

---

## Current Implementation

**File**: `apps/web/src/components/chat/CodeBlock.tsx`

```typescript
// Current implementation - no collapsing
<div className="max-h-[600px] overflow-y-auto">
  {/* Full code rendered */}
</div>
```

---

## Solution

Add collapse functionality with configurable thresholds.

### Step 1: Update CodeBlock Component

**File**: `apps/web/src/components/chat/CodeBlock.tsx`

```typescript
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLLAPSE_THRESHOLD = 15; // Lines before collapsing
const VISIBLE_LINES_TOP = 5; // Lines shown at top when collapsed
const VISIBLE_LINES_BOTTOM = 3; // Lines shown at bottom when collapsed

interface CodeBlockProps {
  code: string;
  language?: string;
  highlightedHtml?: string;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  highlightedHtml,
  className,
}: CodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => code.split('\n'), [code]);
  const shouldCollapse = lines.length > COLLAPSE_THRESHOLD;
  const hiddenCount = lines.length - VISIBLE_LINES_TOP - VISIBLE_LINES_BOTTOM;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Split code for collapsed view
  const topCode = useMemo(() => {
    if (!shouldCollapse || !isCollapsed) return code;
    return lines.slice(0, VISIBLE_LINES_TOP).join('\n');
  }, [code, lines, shouldCollapse, isCollapsed]);

  const bottomCode = useMemo(() => {
    if (!shouldCollapse || !isCollapsed) return null;
    return lines.slice(-VISIBLE_LINES_BOTTOM).join('\n');
  }, [lines, shouldCollapse, isCollapsed]);

  return (
    <div
      className={cn(
        'relative group rounded-lg border overflow-hidden',
        className
      )}
    >
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
                  Expand ({hiddenCount} lines)
                </>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Collapse
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 px-2"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Code content */}
      <div className="relative text-sm">
        {/* Top portion (or full code if expanded) */}
        <pre className="p-4 overflow-x-auto">
          <code className={`language-${language}`}>{topCode}</code>
        </pre>

        {/* Hidden lines indicator */}
        {shouldCollapse && isCollapsed && (
          <>
            <button
              onClick={() => setIsCollapsed(false)}
              className={cn(
                'w-full py-2 flex items-center justify-center gap-2',
                'bg-muted/30 hover:bg-muted/50 transition-colors',
                'text-xs text-muted-foreground',
                'border-y border-dashed border-muted-foreground/30'
              )}
            >
              <span className="border-t border-dashed border-current w-8" />
              <span>{hiddenCount} hidden lines</span>
              <span className="border-t border-dashed border-current w-8" />
            </button>

            {/* Bottom portion */}
            <pre className="p-4 pt-0 overflow-x-auto">
              <code className={`language-${language}`}>{bottomCode}</code>
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
```

### Step 2: User Preference (Optional)

**File**: `apps/web/src/hooks/useCodeBlockSettings.ts`

```typescript
import { useUserPreference } from '@/hooks/useUserPreference';

interface CodeBlockSettings {
  defaultCollapsed: boolean;
  collapseThreshold: number;
  visibleLinesTop: number;
  visibleLinesBottom: number;
}

const defaults: CodeBlockSettings = {
  defaultCollapsed: true,
  collapseThreshold: 15,
  visibleLinesTop: 5,
  visibleLinesBottom: 3,
};

export function useCodeBlockSettings() {
  const [settings, setSettings] = useUserPreference<CodeBlockSettings>(
    'codeBlockSettings',
    defaults
  );

  return { settings, setSettings, defaults };
}
```

### Step 3: Settings UI

**File**: `apps/web/src/app/(main)/settings/appearance/page.tsx`

```typescript
import { useCodeBlockSettings } from '@/hooks/useCodeBlockSettings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export function CodeBlockSettings() {
  const { settings, setSettings, defaults } = useCodeBlockSettings();

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Code Blocks</h4>

      <div className="flex items-center justify-between">
        <Label htmlFor="collapse-default">Collapse long code by default</Label>
        <Switch
          id="collapse-default"
          checked={settings.defaultCollapsed}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, defaultCollapsed: checked })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Collapse threshold: {settings.collapseThreshold} lines</Label>
        <Slider
          value={[settings.collapseThreshold]}
          onValueChange={([value]) =>
            setSettings({ ...settings, collapseThreshold: value })
          }
          min={10}
          max={50}
          step={5}
        />
      </div>
    </div>
  );
}
```

### Step 4: Animated Expansion (Optional)

**File**: Add to `CodeBlock.tsx`

```typescript
import { motion, AnimatePresence } from 'framer-motion';

// Wrap the code content with animation
<AnimatePresence mode="wait">
  {isCollapsed ? (
    <motion.div
      key="collapsed"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Collapsed view */}
    </motion.div>
  ) : (
    <motion.div
      key="expanded"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Full code */}
    </motion.div>
  )}
</AnimatePresence>
```

---

## Testing

### Unit Tests

```typescript
describe('CodeBlock', () => {
  it('should not collapse short code', () => {
    const shortCode = Array(10).fill('line').join('\n');
    render(<CodeBlock code={shortCode} language="javascript" />);

    expect(screen.queryByText(/hidden lines/)).not.toBeInTheDocument();
  });

  it('should collapse long code by default', () => {
    const longCode = Array(50).fill('line').join('\n');
    render(<CodeBlock code={longCode} language="javascript" />);

    expect(screen.getByText(/\d+ hidden lines/)).toBeInTheDocument();
  });

  it('should expand on button click', async () => {
    const longCode = Array(50).fill('line').join('\n');
    render(<CodeBlock code={longCode} language="javascript" />);

    const expandBtn = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandBtn);

    expect(screen.queryByText(/hidden lines/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
  });

  it('should copy full code even when collapsed', async () => {
    const longCode = Array(50).fill('line').join('\n');
    const mockClipboard = { writeText: jest.fn() };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<CodeBlock code={longCode} language="javascript" />);

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyBtn);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(longCode);
  });
});
```

### Edge Cases

- [ ] Very short code (< 15 lines) - should NOT show collapse
- [ ] Exactly threshold lines (15) - should NOT collapse
- [ ] Code with syntax highlighting works when collapsed
- [ ] Copy button copies FULL code even when collapsed
- [ ] Multiple code blocks in one message
- [ ] Code block inside nested markdown (lists, blockquotes)

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Scroll distance for long code | 600px+ | 200px collapsed | 66% reduction |
| Conversation scanability | Poor | Good | Qualitative |
| Code accessibility | Always visible | On-demand | User choice |
| Copy functionality | Full | Full (unchanged) | Maintained |

---

## Risk Assessment

- **Risk Level**: LOW
- **Breaking Changes**: None (behavior change, not API)
- **Accessibility**: Toggle button is keyboard accessible
- **Notes**: Copy always copies full code, never truncated

---

## References

- **Sources**: claude/10-collapsible-code-blocks.md, Open WebUI CodeBlock.svelte
- **Related Issues**: P4-streaming/01-smoothness.md (code block rendering)
- **Design Reference**: GitHub code collapse, VS Code folding
