# Status Timeline for Tools

> **Phase**: P4-streaming | **Effort**: 4h | **Impact**: Tool visibility
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

When the AI is executing tools (web search, code execution, etc.), users see only generic dots or "Thinking..." with no indication of what's actually happening. This creates perceived slowness and uncertainty about whether the system is working or stalled. Multi-step operations have no visual hierarchy.

### Current Behavior

- Tool calls appear inline with message text
- Generic streaming indicator shows bouncing dots
- Status text like "Searching..." displayed inline (if at all)
- No visual hierarchy for multi-step operations
- Users cannot tell whether the model is searching or stalled

### Expected Behavior

- Visual timeline showing tool execution progress
- Vertical connecting line between steps
- Colored status dots (green=complete, blue=in-progress with pulse)
- Collapsible details for each step
- Clear indication of what's happening before text appears

### Visual Design Target

```
┌─────────────────────────────────────┐
│ ● Searching the web           ✓    │
│ │  "weather in San Francisco"      │
│ │                                   │
│ ● Analyzing results           ✓    │
│ │  Found 5 relevant sources        │
│ │                                   │
│ ◉ Generating response        ...   │
│    Processing...                    │
└─────────────────────────────────────┘
```

---

## Current Implementation

**File**: `apps/web/src/components/chat/InlineToolCallContent.tsx`

```typescript
// Tool calls rendered inline
// No visual timeline
// Generic loading indicator
```

---

## Solution

Create a `StatusTimeline` component that displays tool execution as a vertical timeline with status indicators.

### Step 1: Create Status Types

**File**: `apps/web/src/types/status.ts`

```typescript
export interface StatusItem {
  id: string;
  action: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  startedAt?: number;
  completedAt?: number;
  details?: React.ReactNode;
}
```

### Step 2: Create StatusTimeline Component

**File**: `apps/web/src/components/chat/StatusTimeline.tsx`

```typescript
import { cn } from '@/lib/utils';
import { Check, Loader2, X } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface StatusTimelineProps {
  items: StatusItem[];
  isStreaming?: boolean;
}

export function StatusTimeline({ items, isStreaming }: StatusTimelineProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col pl-2 my-2">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-start gap-3">
          {/* Vertical line and dot */}
          <div className="flex flex-col items-center">
            <StatusDot status={item.status} />
            {index < items.length - 1 && (
              <div className="w-0.5 flex-1 min-h-[20px] bg-border" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{item.action}</span>
              <StatusBadge status={item.status} />
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                {item.description}
              </p>
            )}
            {item.details && item.status === 'complete' && (
              <Collapsible className="mt-1">
                <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <span>Show details</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-2 bg-muted/50 rounded text-xs">
                  {item.details}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      ))}

      {/* Streaming indicator at end when all items complete but still generating */}
      {isStreaming && items.every(i => i.status === 'complete') && (
        <div className="flex items-center gap-3 pl-0.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Generating response...</span>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: StatusItem['status'] }) {
  const styles: Record<StatusItem['status'], string> = {
    pending: 'bg-muted-foreground/50',
    in_progress: 'bg-primary animate-pulse',
    complete: 'bg-green-500',
    error: 'bg-destructive',
  };

  return (
    <div
      className={cn(
        'w-2.5 h-2.5 rounded-full mt-1.5 shrink-0',
        styles[status]
      )}
    />
  );
}

function StatusBadge({ status }: { status: StatusItem['status'] }) {
  if (status === 'complete') {
    return <Check className="w-3 h-3 text-green-500" />;
  }
  if (status === 'in_progress') {
    return <Loader2 className="w-3 h-3 text-primary animate-spin" />;
  }
  if (status === 'error') {
    return <X className="w-3 h-3 text-destructive" />;
  }
  return null;
}
```

### Step 3: Create Tool Action Label Map

**File**: `apps/web/src/lib/tool-labels.ts`

```typescript
export const toolActionLabels: Record<string, string> = {
  // Search tools
  web_search: 'Searching the web',
  searchAll: 'Searching the web',
  knowledge_search: 'Searching knowledge base',
  hybrid_search: 'Searching documents',

  // Code tools
  code_execution: 'Running code',
  codeExecution: 'Executing code',

  // File tools
  file_read: 'Reading file',
  file_write: 'Writing file',
  urlReader: 'Reading URL',

  // Image tools
  image_generation: 'Generating image',
  image_analysis: 'Analyzing image',

  // Default
  default: 'Processing',
};

export function getToolActionLabel(toolName: string): string {
  return toolActionLabels[toolName] || `Running ${toolName}`;
}

export function getToolDescription(tool: { name: string; args?: any }): string | undefined {
  const { args } = tool;
  if (!args) return undefined;

  // Extract meaningful description based on tool type
  if (args.query) return `"${args.query}"`;
  if (args.url) return args.url;
  if (args.code) return `${args.code.slice(0, 50)}...`;
  if (args.path) return args.path;

  return undefined;
}
```

### Step 4: Integrate with ChatMessage

**File**: `apps/web/src/components/chat/ChatMessage.tsx`

```typescript
import { StatusTimeline } from './StatusTimeline';
import { useToolCalls } from '@/hooks/useToolCalls';
import { getToolActionLabel, getToolDescription } from '@/lib/tool-labels';

export function ChatMessage({ message, isGenerating }: ChatMessageProps) {
  const { toolCalls } = useToolCalls(message._id);

  // Convert tool calls to status items
  const statusItems: StatusItem[] = toolCalls.map(tool => ({
    id: tool.toolCallId,
    action: getToolActionLabel(tool.name),
    description: getToolDescription({ name: tool.name, args: JSON.parse(tool.arguments || '{}') }),
    status: tool.isPartial ? 'in_progress' : 'complete',
    details: tool.result ? (
      <ToolResultPreview result={JSON.parse(tool.result)} toolName={tool.name} />
    ) : undefined,
  }));

  const showTimeline = statusItems.length > 0 && (
    isGenerating || statusItems.some(s => s.status !== 'complete')
  );

  return (
    <div className="message">
      {/* Show timeline for tool-heavy responses */}
      {showTimeline && (
        <StatusTimeline
          items={statusItems}
          isStreaming={isGenerating && message.status === 'generating'}
        />
      )}

      {/* Message content */}
      {message.content && (
        <MarkdownContent
          content={message.partialContent || message.content}
          isStreaming={isGenerating}
        />
      )}
    </div>
  );
}
```

### Step 5: Create Tool Result Preview

**File**: `apps/web/src/components/chat/ToolResultPreview.tsx`

```typescript
interface ToolResultPreviewProps {
  result: any;
  toolName: string;
}

export function ToolResultPreview({ result, toolName }: ToolResultPreviewProps) {
  // Handle different result types
  if (toolName.includes('search') && Array.isArray(result)) {
    return (
      <div className="space-y-1">
        {result.slice(0, 3).map((item, i) => (
          <div key={i} className="truncate">
            {item.title || item.url || JSON.stringify(item).slice(0, 50)}
          </div>
        ))}
        {result.length > 3 && (
          <div className="text-muted-foreground">
            +{result.length - 3} more results
          </div>
        )}
      </div>
    );
  }

  if (toolName.includes('code')) {
    return (
      <pre className="text-xs overflow-auto max-h-[100px]">
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </pre>
    );
  }

  // Default: JSON preview
  return (
    <pre className="text-xs overflow-auto max-h-[100px]">
      {JSON.stringify(result, null, 2).slice(0, 200)}
      {JSON.stringify(result).length > 200 && '...'}
    </pre>
  );
}
```

---

## Testing

### Manual Verification

1. Send a message that triggers web search
2. Observe timeline appears with "Searching the web" in progress
3. When search completes, dot turns green
4. AI starts responding, streaming indicator shows
5. Click "Show details" to see search results

### Edge Cases

- [ ] Multiple tool calls in sequence
- [ ] Tool call errors (should show red dot)
- [ ] Very fast tool calls (should still show briefly)
- [ ] Tool call during streaming text
- [ ] No tools (should not show timeline)

### Unit Tests

```typescript
describe('StatusTimeline', () => {
  it('should render timeline items', () => {
    const items: StatusItem[] = [
      { id: '1', action: 'Searching the web', status: 'complete' },
      { id: '2', action: 'Generating response', status: 'in_progress' },
    ];

    render(<StatusTimeline items={items} />);

    expect(screen.getByText('Searching the web')).toBeInTheDocument();
    expect(screen.getByText('Generating response')).toBeInTheDocument();
  });

  it('should show green dot for complete items', () => {
    const items = [{ id: '1', action: 'Done', status: 'complete' as const }];

    const { container } = render(<StatusTimeline items={items} />);

    const dot = container.querySelector('.bg-green-500');
    expect(dot).toBeInTheDocument();
  });

  it('should show pulsing dot for in-progress items', () => {
    const items = [{ id: '1', action: 'Working', status: 'in_progress' as const }];

    const { container } = render(<StatusTimeline items={items} />);

    const dot = container.querySelector('.animate-pulse');
    expect(dot).toBeInTheDocument();
  });

  it('should not render when no items', () => {
    const { container } = render(<StatusTimeline items={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Tool visibility | None | Full timeline | Clear feedback |
| User uncertainty | "Is it working?" | "Step 2 of 3" | Reduced |
| Perceived speed | Slower | Faster | Progress visible |
| Professional polish | Generic dots | Detailed timeline | Modern UX |

---

## Risk Assessment

- **Breaking Changes**: None - additive component
- **Performance**: Minimal - simple DOM updates
- **Accessibility**: Should announce status changes to screen readers
- **Complexity**: Low - straightforward component

---

## References

- **Sources**: claude/05-status-timeline.md, codex/04-status-timeline-for-tools.md
- **Open WebUI Pattern**: StatusHistory.svelte with vertical timeline
- **shadcn Collapsible**: https://ui.shadcn.com/docs/components/collapsible
- **Related Issues**: P3-generation/02-tool-call-consistency.md
