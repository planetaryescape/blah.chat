# Tool Status Timeline

> **Priority**: P1 (Important)
> **Effort**: Medium (3-5 hours)
> **Impact**: Medium - Better visibility into AI tool execution

---

## Summary

Replace inline tool status text with a visual timeline component that shows tool execution progress with a vertical connecting line, status dots, and collapsible details. This matches the Open WebUI pattern and provides clearer feedback during multi-step tool calls.

---

## Current State

### Current Tool Status Display

**File**: `apps/web/src/components/chat/InlineToolCallContent.tsx`

Tool calls are rendered inline with content, showing streaming dots while processing.

**Current appearance** (simplified):
- Tool calls appear inline with message text
- Streaming indicator shows bouncing dots
- Status text like "Searching..." displayed inline
- No visual hierarchy for multi-step operations

---

## Problem

### Why Timeline Is Better

1. **Visual hierarchy**: Clear separation of steps in multi-tool operations
2. **Progress tracking**: Users can see which steps are complete vs in-progress
3. **Collapsibility**: Long tool outputs can be collapsed
4. **Polish**: Professional appearance matching modern AI interfaces

### What Open WebUI Does

```svelte
<!-- StatusHistory.svelte - vertical timeline -->
<div class="flex flex-col">
  {#each statusHistory as status, i}
    <div class="flex items-start gap-2">
      <!-- Vertical connecting line -->
      <div class="flex flex-col items-center">
        <div class="w-2 h-2 rounded-full {status.done ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}" />
        {#if i < statusHistory.length - 1}
          <div class="w-0.5 h-full bg-border" />
        {/if}
      </div>
      <!-- Status content -->
      <div class="flex-1 pb-4">
        <span class="text-sm">{status.action}</span>
        {#if status.done}
          <span class="text-xs text-muted-foreground">Completed</span>
        {:else}
          <span class="text-xs animate-pulse">In progress...</span>
        {/if}
      </div>
    </div>
  {/each}
</div>
```

They show:
- Vertical line connecting status items
- Colored dots (green=complete, blue=in-progress with pulse)
- Collapsible details for each step
- Shimmer effect on in-progress items

---

## Solution

### Implementation

Create a new `StatusTimeline` component:

```typescript
// apps/web/src/components/chat/StatusTimeline.tsx

interface StatusItem {
  id: string;
  action: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  startedAt?: number;
  completedAt?: number;
  details?: React.ReactNode;
}

interface StatusTimelineProps {
  items: StatusItem[];
  isStreaming?: boolean;
}

export function StatusTimeline({ items, isStreaming }: StatusTimelineProps) {
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
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.description}
              </p>
            )}
            {item.details && (
              <Collapsible>
                <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
                  Show details
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  {item.details}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      ))}

      {/* Streaming indicator at end */}
      {isStreaming && items[items.length - 1]?.status === 'complete' && (
        <div className="flex items-center gap-3 pl-0.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Processing...</span>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: StatusItem['status'] }) {
  const styles = {
    pending: 'bg-muted-foreground/50',
    in_progress: 'bg-primary animate-pulse',
    complete: 'bg-green-500',
    error: 'bg-destructive',
  };

  return (
    <div className={cn(
      'w-2.5 h-2.5 rounded-full mt-1.5',
      styles[status]
    )} />
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

### Integration with Tool Calls

```typescript
// In ChatMessage.tsx or InlineToolCallContent.tsx

// Convert tool calls to status items
const statusItems: StatusItem[] = toolCalls.map(tool => ({
  id: tool.id,
  action: getToolActionLabel(tool.name), // e.g., "Searching the web"
  description: tool.args?.query || tool.args?.url,
  status: tool.isPartial ? 'in_progress' : 'complete',
  details: tool.result && <ToolResultPreview result={tool.result} />,
}));

// Render timeline instead of inline
<StatusTimeline items={statusItems} isStreaming={isGenerating} />
```

### Tool Action Labels

```typescript
const toolActionLabels: Record<string, string> = {
  web_search: 'Searching the web',
  code_execution: 'Running code',
  image_generation: 'Generating image',
  file_read: 'Reading file',
  knowledge_search: 'Searching knowledge base',
};

function getToolActionLabel(toolName: string): string {
  return toolActionLabels[toolName] || `Running ${toolName}`;
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/components/chat/StatusTimeline.tsx` | Create new component |
| `apps/web/src/components/chat/InlineToolCallContent.tsx` | Use StatusTimeline |
| `apps/web/src/components/chat/ChatMessage.tsx` | Pass tool calls to timeline |

---

## Testing

### Manual Testing

1. Send a message that triggers web search
2. Observe timeline appears with "Searching the web" in progress
3. When search completes, dot turns green
4. AI starts responding, streaming indicator shows
5. Click "Show details" to see search results

### Edge Cases

- [ ] Multiple tool calls in sequence
- [ ] Tool call errors
- [ ] Very fast tool calls (should still show briefly)
- [ ] Tool call during streaming text

---

## References

### Open WebUI StatusHistory

Their implementation uses:
- Svelte transitions for smooth animations
- Shimmer effect on in-progress items
- Time elapsed display
- Collapsible result previews

### Visual Design

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

## Notes

- **Keep it minimal** - don't show timeline for simple responses without tools
- **Animate thoughtfully** - pulse for in-progress, no animation for complete
- **Collapsible by default** - tool results can be verbose
- **Accessible** - ensure screen readers announce status changes