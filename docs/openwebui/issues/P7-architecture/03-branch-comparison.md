# Branch Comparison View

> **Phase**: P7-architecture | **Effort**: 4h | **Impact**: Enable model comparison UX
> **Dependencies**: P7-architecture/01-tree-schema.md, P7-architecture/02-message-operations.md | **Breaking**: No
> **Status**: ✅ Complete (2026-01-20)

---

## Problem Statement

Users cannot easily compare different AI responses to the same prompt. With tree-based branching, users can generate multiple responses from different models or regenerate responses, but there's no UI to view these side-by-side. Users must manually switch between branches to compare, losing context and making comparison tedious.

### Current Behavior

- Multiple branches exist at a message point
- User can only view one branch at a time
- No visual indication of branch points
- No side-by-side comparison
- Must click through branches sequentially

### Expected Behavior

- Visual indicator at branch points (showing N alternatives)
- Click to expand side-by-side comparison view
- Compare 2-4 responses simultaneously
- See model name, generation time, token usage
- Easy selection of preferred response

---

## Current Implementation

No branch comparison UI exists. Tree structure from P7-01 and P7-02 enables this feature.

---

## Solution

Create a branch comparison component that renders sibling responses side-by-side.

### Step 1: Create Branch Indicator Component

**File**: `apps/web/src/components/chat/BranchIndicator.tsx`

```typescript
import { ChevronLeft, ChevronRight, GitBranch, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BranchIndicatorProps {
  branches: Array<{
    id: string;
    label: string;
    isActive: boolean;
    model?: string;
  }>;
  currentIndex: number;
  onSwitchBranch: (branchId: string) => void;
  onOpenComparison: () => void;
}

export function BranchIndicator({
  branches,
  currentIndex,
  onSwitchBranch,
  onOpenComparison,
}: BranchIndicatorProps) {
  if (branches.length <= 1) return null;

  const handlePrevious = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : branches.length - 1;
    onSwitchBranch(branches[prevIndex].id);
  };

  const handleNext = () => {
    const nextIndex = currentIndex < branches.length - 1 ? currentIndex + 1 : 0;
    onSwitchBranch(branches[nextIndex].id);
  };

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <GitBranch className="w-3 h-3" />

      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        onClick={handlePrevious}
        aria-label="Previous branch"
      >
        <ChevronLeft className="w-3 h-3" />
      </Button>

      <span className="min-w-[3ch] text-center">
        {currentIndex + 1}/{branches.length}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        onClick={handleNext}
        aria-label="Next branch"
      >
        <ChevronRight className="w-3 h-3" />
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onOpenComparison}
            aria-label="Compare branches"
          >
            <Columns className="w-3 h-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Compare all {branches.length} responses
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
```

### Step 2: Create Comparison View Component

**File**: `apps/web/src/components/chat/BranchComparison.tsx`

```typescript
import { useState } from 'react';
import { X, Check, Star, Copy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownContent } from './MarkdownContent';
import { cn } from '@/lib/utils';

interface Branch {
  id: string;
  content: string;
  model: string;
  label: string;
  isActive: boolean;
  createdAt: number;
  tokenCount?: number;
  generationTime?: number;
}

interface BranchComparisonProps {
  branches: Branch[];
  onClose: () => void;
  onSelectBranch: (branchId: string) => void;
  onRegenerate: (branchId: string, modelId?: string) => void;
}

export function BranchComparison({
  branches,
  onClose,
  onSelectBranch,
  onRegenerate,
}: BranchComparisonProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    branches.find(b => b.isActive)?.id || null
  );

  const handleSelect = (branchId: string) => {
    setSelectedId(branchId);
    onSelectBranch(branchId);
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-4 bg-background border rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            Compare {branches.length} Responses
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Comparison Grid */}
        <div className="flex-1 overflow-hidden">
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: `repeat(${Math.min(branches.length, 4)}, 1fr)`,
            }}
          >
            {branches.slice(0, 4).map((branch) => (
              <div
                key={branch.id}
                className={cn(
                  'flex flex-col border-r last:border-r-0',
                  selectedId === branch.id && 'bg-primary/5'
                )}
              >
                {/* Branch Header */}
                <div className="p-3 border-b space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                      {branch.model}
                    </Badge>
                    {branch.isActive && (
                      <Badge variant="outline" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{branch.label}</span>
                    {branch.tokenCount && (
                      <span>• {branch.tokenCount} tokens</span>
                    )}
                    {branch.generationTime && (
                      <span>• {(branch.generationTime / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                </div>

                {/* Branch Content */}
                <ScrollArea className="flex-1 p-3">
                  <MarkdownContent content={branch.content} />
                </ScrollArea>

                {/* Branch Actions */}
                <div className="p-3 border-t flex items-center gap-2">
                  <Button
                    variant={selectedId === branch.id ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSelect(branch.id)}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {selectedId === branch.id ? 'Selected' : 'Select'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(branch.content)}
                    aria-label="Copy response"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRegenerate(branch.id)}
                    aria-label="Regenerate"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {branches.length > 4 && (
          <div className="p-3 border-t text-center text-sm text-muted-foreground">
            Showing 4 of {branches.length} responses. Use branch navigation to see others.
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 3: Create Comparison Hook

**File**: `apps/web/src/hooks/useBranchComparison.ts`

```typescript
import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface UseBranchComparisonProps {
  messageId: string;
}

export function useBranchComparison({ messageId }: UseBranchComparisonProps) {
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Get all branches at this message point
  const branchesQuery = useQuery(api.messages.getBranchesAtMessage, {
    messageId,
  });

  // Get full content for each branch
  const branchContents = useQuery(
    api.messages.getBranchContents,
    branchesQuery ? { branchIds: branchesQuery.map(b => b.id) } : 'skip'
  );

  const branches = useMemo(() => {
    if (!branchesQuery || !branchContents) return [];

    return branchesQuery.map((branch, i) => ({
      ...branch,
      content: branchContents[i]?.content || '',
      tokenCount: branchContents[i]?.tokenCount,
      generationTime: branchContents[i]?.generationTime,
    }));
  }, [branchesQuery, branchContents]);

  const currentIndex = branches.findIndex(b => b.isActive);

  return {
    branches,
    currentIndex,
    hasBranches: branches.length > 1,
    isComparisonOpen,
    openComparison: () => setIsComparisonOpen(true),
    closeComparison: () => setIsComparisonOpen(false),
  };
}
```

### Step 4: Backend Query for Branch Contents

**File**: `packages/backend/convex/messages.ts`

```typescript
export const getBranchesAtMessage = internalQuery({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    // Get parent to find siblings
    const parentId = message.parentMessageIds[0];
    if (!parentId) return [message]; // No siblings if no parent

    const parent = await ctx.db.get(parentId);
    if (!parent) return [message];

    // Get all children of parent (siblings)
    const siblings = await Promise.all(
      parent.childMessageIds.map(id => ctx.db.get(id))
    );

    return siblings
      .filter(Boolean)
      .map(sibling => ({
        id: sibling!._id,
        label: sibling!.branchLabel || 'main',
        model: sibling!.model || 'unknown',
        isActive: sibling!.isActive,
        createdAt: sibling!.createdAt,
        forkReason: sibling!.forkReason,
      }));
  },
});

export const getBranchContents = internalQuery({
  args: {
    branchIds: v.array(v.id('messages')),
  },
  handler: async (ctx, args) => {
    const messages = await Promise.all(
      args.branchIds.map(id => ctx.db.get(id))
    );

    return messages.map(msg => msg ? {
      content: msg.content,
      tokenCount: msg.metadata?.outputTokens,
      generationTime: msg.generationCompletedAt && msg.generationStartedAt
        ? msg.generationCompletedAt - msg.generationStartedAt
        : undefined,
    } : null);
  },
});
```

### Step 5: Integrate with ChatMessage

**File**: `apps/web/src/components/chat/ChatMessage.tsx`

```typescript
import { BranchIndicator } from './BranchIndicator';
import { BranchComparison } from './BranchComparison';
import { useBranchComparison } from '@/hooks/useBranchComparison';
import { useBranching } from '@/hooks/useBranching';

export function ChatMessage({ message }: ChatMessageProps) {
  const {
    branches,
    currentIndex,
    hasBranches,
    isComparisonOpen,
    openComparison,
    closeComparison,
  } = useBranchComparison({ messageId: message._id });

  const { switchBranch, regenerateResponse } = useBranching(message.conversationId);

  return (
    <article className="message">
      {/* Message content */}
      <div className="message-content">
        <MarkdownContent content={message.content} />
      </div>

      {/* Branch indicator */}
      {hasBranches && (
        <div className="message-footer">
          <BranchIndicator
            branches={branches}
            currentIndex={currentIndex}
            onSwitchBranch={switchBranch}
            onOpenComparison={openComparison}
          />
        </div>
      )}

      {/* Comparison modal */}
      {isComparisonOpen && (
        <BranchComparison
          branches={branches}
          onClose={closeComparison}
          onSelectBranch={switchBranch}
          onRegenerate={regenerateResponse}
        />
      )}
    </article>
  );
}
```

### Step 6: Add Comparison Styles

**File**: `apps/web/src/app/globals.css`

```css
/* Branch comparison grid */
.branch-comparison {
  display: grid;
  gap: 0;
}

.branch-comparison-column {
  display: flex;
  flex-direction: column;
  border-right: 1px solid hsl(var(--border));
}

.branch-comparison-column:last-child {
  border-right: none;
}

/* Selected branch highlight */
.branch-comparison-column.selected {
  background: hsl(var(--primary) / 0.05);
}

/* Responsive: stack on mobile */
@media (max-width: 768px) {
  .branch-comparison {
    grid-template-columns: 1fr !important;
  }

  .branch-comparison-column {
    border-right: none;
    border-bottom: 1px solid hsl(var(--border));
  }
}
```

---

## Testing

### Manual Testing

1. Create a conversation with user message
2. Generate response from GPT-4o
3. Click "Regenerate" to create branch
4. **Expected**: Branch indicator shows "1/2"
5. Click comparison icon
6. **Expected**: Side-by-side view opens
7. Select preferred response
8. **Expected**: That branch becomes active

### Unit Tests

```typescript
describe('BranchComparison', () => {
  it('should display all branches side by side', () => {
    const branches = [
      { id: '1', content: 'Response 1', model: 'gpt-4o', label: 'main', isActive: true },
      { id: '2', content: 'Response 2', model: 'claude-3-opus', label: 'main.1', isActive: false },
    ];

    render(
      <BranchComparison
        branches={branches}
        onClose={jest.fn()}
        onSelectBranch={jest.fn()}
        onRegenerate={jest.fn()}
      />
    );

    expect(screen.getByText('Response 1')).toBeInTheDocument();
    expect(screen.getByText('Response 2')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    expect(screen.getByText('claude-3-opus')).toBeInTheDocument();
  });

  it('should call onSelectBranch when selecting', () => {
    const onSelectBranch = jest.fn();
    const branches = [
      { id: '1', content: 'R1', model: 'm1', label: 'main', isActive: true },
      { id: '2', content: 'R2', model: 'm2', label: 'main.1', isActive: false },
    ];

    render(
      <BranchComparison
        branches={branches}
        onClose={jest.fn()}
        onSelectBranch={onSelectBranch}
        onRegenerate={jest.fn()}
      />
    );

    fireEvent.click(screen.getAllByText('Select')[1]);

    expect(onSelectBranch).toHaveBeenCalledWith('2');
  });
});

describe('BranchIndicator', () => {
  it('should show branch count', () => {
    const branches = [
      { id: '1', label: 'main', isActive: true },
      { id: '2', label: 'main.1', isActive: false },
      { id: '3', label: 'main.2', isActive: false },
    ];

    render(
      <BranchIndicator
        branches={branches}
        currentIndex={0}
        onSwitchBranch={jest.fn()}
        onOpenComparison={jest.fn()}
      />
    );

    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('should not render with single branch', () => {
    const { container } = render(
      <BranchIndicator
        branches={[{ id: '1', label: 'main', isActive: true }]}
        currentIndex={0}
        onSwitchBranch={jest.fn()}
        onOpenComparison={jest.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Compare responses | Manual (switch branches) | Side-by-side | Instant |
| Response selection | Guesswork | Informed decision | Quality |
| Model comparison | Not possible | Built-in | New feature |
| User satisfaction | N/A | High | New capability |

---

## Risk Assessment

- **Risk Level**: LOW
- **Breaking Changes**: None (new UI feature)
- **Performance Impact**: Minimal (loads branch content on demand)
- **Accessibility**: Keyboard navigation, screen reader support
- **Mobile**: Responsive layout (stacked on small screens)

---

## References

- **Sources**: kimi/05-architecture/03-branch-creation.md, deep-research-report.md
- **Inspiration**: ChatGPT response regeneration, Claude conversation branching
- **Related Issues**: P7-architecture/01-tree-schema.md, P7-architecture/02-message-operations.md, P9-features/02-follow-up-suggestions.md
