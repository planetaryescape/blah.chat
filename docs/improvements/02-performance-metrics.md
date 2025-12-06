# Performance Metrics: TTFT & TPS Display

## Context

### User Requirement (NEW)
Display performance metrics next to model name on AI message bubbles:
- **TTFT** (Time To First Token) - How long until AI starts responding
- **TPS** (Tokens Per Second) - Generation speed once started

### Why This Matters

**For Users:**
- Understand model performance characteristics
- Compare models objectively (GPT-5 vs Claude 4.5 Opus)
- Identify slow responses vs thinking time
- Make informed model selection decisions

**For Developers:**
- Debug API latency issues
- Monitor inference provider performance
- Track performance regressions

### Current State

**Existing Timing Fields in Schema:**
- `generationStartedAt` - When Convex action begins
- `generationCompletedAt` - When streaming finishes
- `outputTokens` - Total tokens generated
- `inputTokens` - Prompt tokens

**Missing:**
- `firstTokenAt` - When first token received (for TTFT)
- `tokensPerSecond` - Calculated TPS

**Current UI:**
Model badge shown at bottom of AI messages with token count and cost, but no timing information.

---

## Requirements

1. **Schema Changes:** Add `firstTokenAt` and `tokensPerSecond` fields to messages table
2. **Capture Timing:** Record first token timestamp during streaming
3. **Calculate TPS:** Compute tokens/second on completion
4. **Display Metrics:** Show TTFT and TPS badges next to model name
5. **Tooltips:** Explain metrics on hover
6. **Handle Edge Cases:** Cached responses, very fast models, incomplete generations

---

## Technical Approach

### 1. Schema Updates

**File:** `convex/schema.ts`

**Current messages schema** (line ~1320-1370):
```typescript
messages: defineTable({
  conversationId: v.id("conversations"),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("error")
  ),
  // ... existing fields
  generationStartedAt: v.optional(v.number()),
  generationCompletedAt: v.optional(v.number()),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  // ... other fields
})
```

**Add these fields:**
```typescript
messages: defineTable({
  // ... existing fields
  generationStartedAt: v.optional(v.number()),
  generationCompletedAt: v.optional(v.number()),

  // NEW: Performance metrics
  firstTokenAt: v.optional(v.number()), // Timestamp when first token received
  tokensPerSecond: v.optional(v.number()), // Calculated TPS (output tokens / duration)

  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  // ... rest of fields
})
```

**Migration:** No migration needed - optional fields, existing messages unaffected.

---

### 2. Capture Timing in Convex Action

**File:** `convex/chat.ts`

**Current streaming logic** (~line 200-300):
```typescript
export const sendMessage = action({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // Update message status to generating
    await ctx.runMutation(internal.messages.updateStatus, {
      messageId,
      status: "generating",
      generationStartedAt: startTime,
    });

    // Stream from LLM
    const stream = await streamText({ /* ... */ });

    for await (const chunk of stream.textStream) {
      // Update partial content periodically
      await ctx.runMutation(internal.messages.updatePartialContent, {
        messageId,
        partialContent: accumulatedText,
      });
    }

    // Mark complete
    await ctx.runMutation(internal.messages.completeMessage, {
      messageId,
      content: finalText,
      generationCompletedAt: Date.now(),
    });
  },
});
```

**Enhanced with timing capture:**
```typescript
export const sendMessage = action({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    let firstTokenTime: number | undefined;
    let tokenCount = 0;
    let accumulatedText = "";

    // Update message status to generating
    await ctx.runMutation(internal.messages.updateStatus, {
      messageId,
      status: "generating",
      generationStartedAt: startTime,
    });

    // Stream from LLM
    const stream = await streamText({ /* ... */ });

    for await (const chunk of stream.textStream) {
      // Capture first token timestamp
      if (!firstTokenTime && chunk.length > 0) {
        firstTokenTime = Date.now();

        // Immediately update message with TTFT
        await ctx.runMutation(internal.messages.updateMetrics, {
          messageId,
          firstTokenAt: firstTokenTime,
        });
      }

      accumulatedText += chunk;
      tokenCount++; // Increment per chunk (approximate)

      // Update partial content periodically (~200ms intervals)
      if (Date.now() - lastUpdateTime > 200) {
        await ctx.runMutation(internal.messages.updatePartialContent, {
          messageId,
          partialContent: accumulatedText,
        });
        lastUpdateTime = Date.now();
      }
    }

    const endTime = Date.now();

    // Calculate TPS
    // Use outputTokens from finalResponse if available, fallback to tokenCount
    const finalResponse = await stream.response;
    const actualTokens = finalResponse.usage?.outputTokens || tokenCount;
    const duration = (endTime - startTime) / 1000; // Convert to seconds
    const tps = actualTokens / duration;

    // Mark complete with metrics
    await ctx.runMutation(internal.messages.completeMessage, {
      messageId,
      content: finalText,
      generationCompletedAt: endTime,
      tokensPerSecond: tps,
      outputTokens: actualTokens,
    });
  },
});
```

---

### 3. Update Mutations

**File:** `convex/messages.ts`

**Add new internal mutation for metrics:**
```typescript
export const updateMetrics = internalMutation({
  args: {
    messageId: v.id("messages"),
    firstTokenAt: v.optional(v.number()),
    tokensPerSecond: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      firstTokenAt: args.firstTokenAt,
      tokensPerSecond: args.tokensPerSecond,
    });
  },
});
```

**Update completeMessage mutation:**
```typescript
export const completeMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    generationCompletedAt: v.number(),
    tokensPerSecond: v.optional(v.number()), // NEW
    outputTokens: v.optional(v.number()),
    // ... other args
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "complete",
      content: args.content,
      generationCompletedAt: args.generationCompletedAt,
      tokensPerSecond: args.tokensPerSecond, // NEW
      outputTokens: args.outputTokens,
      // ... other fields
    });
  },
});
```

---

### 4. Display Metrics in UI

**File:** `src/components/chat/ChatMessage.tsx`

**Current model badge** (line ~221-229):
```typescript
{!isUser && message.status === "complete" && (
  <div className="absolute -bottom-5 left-4">
    <Badge variant="outline" className="text-xs">
      {modelName}
    </Badge>
  </div>
)}
```

**Enhanced with TTFT & TPS:**
```typescript
{!isUser && message.status === "complete" && (
  <div className="absolute -bottom-5 left-4 flex items-center gap-2">
    {/* Model name badge */}
    <Badge variant="outline" className="text-xs">
      {modelName}
    </Badge>

    {/* TTFT badge */}
    {message.firstTokenAt && message.generationStartedAt && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-[10px] h-5 font-mono tabular-nums cursor-help"
          >
            {formatTTFT(message.firstTokenAt - message.generationStartedAt)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-semibold">Time to First Token</div>
            <div className="text-muted-foreground">
              How long until the AI started responding
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    )}

    {/* TPS badge */}
    {message.tokensPerSecond && message.status === "complete" && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-[10px] h-5 font-mono tabular-nums cursor-help"
          >
            {Math.round(message.tokensPerSecond)} t/s
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-semibold">Tokens Per Second</div>
            <div className="text-muted-foreground">
              Generation speed: {Math.round(message.tokensPerSecond)} tokens/sec
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    )}
  </div>
)}
```

**Helper function for TTFT formatting:**
```typescript
function formatTTFT(milliseconds: number): string {
  if (milliseconds < 100) {
    // Very fast - show milliseconds
    return `${Math.round(milliseconds)}ms`;
  } else if (milliseconds < 1000) {
    // Sub-second - show with decimal
    return `${(milliseconds / 1000).toFixed(2)}s`;
  } else if (milliseconds < 10000) {
    // 1-10 seconds - show one decimal
    return `${(milliseconds / 1000).toFixed(1)}s`;
  } else {
    // Over 10 seconds - show whole seconds
    return `${Math.round(milliseconds / 1000)}s`;
  }
}
```

---

### 5. Streaming State (Show TTFT Early)

**Enhancement:** Show TTFT badge while still generating

```typescript
{!isUser && (message.status === "generating" || message.status === "complete") && (
  <div className="absolute -bottom-5 left-4 flex items-center gap-2">
    <Badge variant="outline" className="text-xs">
      {modelName}
    </Badge>

    {/* Show TTFT as soon as first token arrives */}
    {message.firstTokenAt && message.generationStartedAt && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 font-mono tabular-nums cursor-help",
              message.status === "generating" && "animate-pulse"
            )}
          >
            {formatTTFT(message.firstTokenAt - message.generationStartedAt)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-semibold">Time to First Token</div>
            <div className="text-muted-foreground">
              {message.status === "generating"
                ? "AI started responding"
                : "How long until the AI started responding"}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    )}

    {/* TPS only on completion */}
    {message.tokensPerSecond && message.status === "complete" && (
      {/* ... TPS badge ... */}
    )}
  </div>
)}
```

---

## Design Specs

### Visual Layout
```
┌─────────────────────────────────┐
│ AI message bubble               │
│ Content here...                 │
└─────────────────────────────────┘
  [Model] [0.45s] [127 t/s]
  ↑       ↑       ↑
  Model   TTFT    TPS
```

### Badge Styling
- **Size:** `h-5` (20px height), `text-[10px]`
- **Font:** `font-mono tabular-nums` (monospace, aligned digits)
- **Spacing:** `gap-2` between badges
- **Border:** `variant="outline"` (subtle border)
- **Hover:** `cursor-help` + tooltip

### Tooltip Content
```
┌────────────────────────────┐
│ Time to First Token        │  ← Bold
│ How long until the AI      │  ← Muted
│ started responding         │
└────────────────────────────┘
```

### Color & Contrast
- Badges inherit from `Badge` component (meets WCAG AA)
- Tooltip uses `TooltipContent` component (high contrast)

### Animations
- Generating state: `animate-pulse` on TTFT badge
- Completion: pulse stops, TPS badge fades in

---

## Accessibility Requirements

### ARIA Attributes

**Badges:**
```typescript
<Badge
  variant="outline"
  role="status"
  aria-label={`Time to first token: ${formatTTFT(ttft)}`}
  className="..."
>
  {formatTTFT(ttft)}
</Badge>
```

**Tooltips:**
- Already accessible via shadcn Tooltip component
- Proper ARIA roles (`role="tooltip"`)
- Keyboard accessible (focus triggers tooltip)

**Screen Reader Announcements:**
```typescript
{message.status === "complete" && (
  <div className="sr-only" role="status" aria-live="polite">
    Response generated in {formatTTFT(ttft)} with {Math.round(tps)} tokens per second
  </div>
)}
```

---

## Edge Cases

### 1. Cached Responses
**Problem:** Cached responses may have instant TTFT (<10ms)
**Solution:** Show "cached" indicator instead of misleading timing

```typescript
const isCached = message.firstTokenAt &&
                 message.generationStartedAt &&
                 (message.firstTokenAt - message.generationStartedAt) < 50;

{isCached ? (
  <Tooltip>
    <TooltipTrigger asChild>
      <Badge variant="outline" className="text-[10px] h-5">
        <Zap className="w-3 h-3 mr-1" />
        cached
      </Badge>
    </TooltipTrigger>
    <TooltipContent>
      Response served from cache (instant)
    </TooltipContent>
  </Tooltip>
) : (
  {/* Normal TTFT badge */}
)}
```

### 2. Very Slow TTFT (>10s)
**Problem:** User might think it failed
**Solution:** Show loading state, warn if > 30s

```typescript
{message.status === "generating" && !message.firstTokenAt && (
  <Badge variant="outline" className="text-[10px] h-5 animate-pulse">
    waiting...
  </Badge>
)}

// If > 30s, show warning
{message.generationStartedAt &&
 Date.now() - message.generationStartedAt > 30000 &&
 !message.firstTokenAt && (
  <Badge variant="destructive" className="text-[10px] h-5">
    slow response
  </Badge>
)}
```

### 3. Incomplete Generations (Errors)
**Problem:** Error during streaming - no TPS calculated
**Solution:** Show partial metrics, indicate incomplete

```typescript
{message.status === "error" && message.firstTokenAt && (
  <Badge variant="outline" className="text-[10px] h-5">
    {formatTTFT(message.firstTokenAt - message.generationStartedAt!)}
    <AlertCircle className="w-3 h-3 ml-1 text-destructive" />
  </Badge>
)}
```

### 4. Comparison Mode
**Problem:** Multiple model responses - each needs own metrics
**Solution:** Already handled - each message has own metrics

```typescript
// In ComparisonPanel.tsx
{responses.map(response => (
  <ChatMessage key={response._id} message={response} />
  // Each ChatMessage shows its own TTFT/TPS
))}
```

### 5. Token Count Accuracy
**Problem:** Chunk count != actual tokens (approximation)
**Solution:** Use `usage.outputTokens` from final response

```typescript
// In convex/chat.ts
const finalResponse = await stream.response;
const actualTokens = finalResponse.usage?.outputTokens || tokenCount;
const tps = actualTokens / duration;
```

---

## Testing Checklist

### Schema & Backend
- [ ] Schema migration succeeds (optional fields)
- [ ] `firstTokenAt` captured on first chunk
- [ ] `tokensPerSecond` calculated on completion
- [ ] Metrics stored in Convex DB
- [ ] Existing messages unaffected (no errors)

### Timing Accuracy
- [ ] TTFT accurate within 50ms
- [ ] TPS calculation correct (manual verification)
- [ ] Cached responses detected (<50ms TTFT)
- [ ] Slow responses don't break calculation

### UI Display
- [ ] TTFT badge appears when first token arrives
- [ ] TPS badge appears on completion
- [ ] Badges positioned correctly (bottom-left, after model name)
- [ ] Monospace font renders properly
- [ ] Tooltips show explanations
- [ ] Generating state shows pulse animation

### Edge Cases
- [ ] Cached response shows "cached" badge
- [ ] Slow TTFT (>10s) shows "waiting..." then timing
- [ ] Error mid-generation shows partial metrics
- [ ] Comparison mode shows metrics per model
- [ ] Very fast models (<100ms) show milliseconds
- [ ] Very slow models (>10s) show whole seconds

### Accessibility
- [ ] Screen reader announces metrics on completion
- [ ] Tooltips keyboard accessible (Tab + hover)
- [ ] ARIA labels present on badges
- [ ] High contrast mode - badges visible

### Cross-browser
- [ ] Chrome - tabular-nums font renders correctly
- [ ] Firefox - badges aligned properly
- [ ] Safari - timing calculations accurate
- [ ] Mobile - badges don't overflow on small screens

---

## Critical Files to Modify

1. **`/Users/bhekanik/code/planetaryescape/blah.chat/convex/schema.ts`**
   - Add `firstTokenAt` and `tokensPerSecond` fields to messages table

2. **`/Users/bhekanik/code/planetaryescape/blah.chat/convex/chat.ts`**
   - Capture `firstTokenTime` on first chunk
   - Calculate TPS on completion
   - Pass metrics to `completeMessage` mutation

3. **`/Users/bhekanik/code/planetaryescape/blah.chat/convex/messages.ts`**
   - Create `updateMetrics` internal mutation
   - Update `completeMessage` to accept TPS

4. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ChatMessage.tsx`**
   - Add TTFT and TPS badges next to model name
   - Implement formatTTFT helper function
   - Add tooltips with explanations

---

## Code Examples

### Complete Timing Capture (convex/chat.ts)
```typescript
export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    model: v.string(),
    // ... other args
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    let firstTokenTime: number | undefined;
    let lastUpdateTime = startTime;
    let accumulatedText = "";

    // Create assistant message
    const messageId = await ctx.runMutation(internal.messages.create, {
      conversationId: args.conversationId,
      role: "assistant",
      content: "",
      status: "generating",
      generationStartedAt: startTime,
    });

    try {
      // Stream from LLM
      const stream = await streamText({
        model: registry.languageModel(args.model),
        messages: formattedMessages,
      });

      for await (const chunk of stream.textStream) {
        // Capture first token timestamp
        if (!firstTokenTime && chunk.length > 0) {
          firstTokenTime = Date.now();
          await ctx.runMutation(internal.messages.updateMetrics, {
            messageId,
            firstTokenAt: firstTokenTime,
          });
        }

        accumulatedText += chunk;

        // Update partial content every 200ms
        if (Date.now() - lastUpdateTime > 200) {
          await ctx.runMutation(internal.messages.updatePartialContent, {
            messageId,
            partialContent: accumulatedText,
          });
          lastUpdateTime = Date.now();
        }
      }

      // Get final response with usage data
      const finalResponse = await stream.response;
      const endTime = Date.now();

      // Calculate TPS
      const outputTokens = finalResponse.usage?.outputTokens || 0;
      const duration = (endTime - startTime) / 1000; // seconds
      const tps = duration > 0 ? outputTokens / duration : 0;

      // Mark complete
      await ctx.runMutation(internal.messages.completeMessage, {
        messageId,
        content: accumulatedText,
        generationCompletedAt: endTime,
        tokensPerSecond: tps,
        outputTokens,
        inputTokens: finalResponse.usage?.inputTokens,
      });

    } catch (error) {
      await ctx.runMutation(internal.messages.setError, {
        messageId,
        error: String(error),
      });
      throw error;
    }
  },
});
```

### Complete UI Component (ChatMessage.tsx)
```typescript
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTTFT(ms: number): string {
  if (ms < 100) return `${Math.round(ms)}ms`;
  if (ms < 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 10000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000)}s`;
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const modelName = getModelConfig(message.model)?.name || message.model;

  const ttft = message.firstTokenAt && message.generationStartedAt
    ? message.firstTokenAt - message.generationStartedAt
    : null;

  const isCached = ttft !== null && ttft < 50;

  return (
    <div className={cn("message", isUser && "user-message")}>
      {/* Message content */}
      <div className="content">
        {message.content}
      </div>

      {/* Metrics badges (AI messages only) */}
      {!isUser && (message.status === "generating" || message.status === "complete") && (
        <div className="absolute -bottom-5 left-4 flex items-center gap-2">
          {/* Model name */}
          <Badge variant="outline" className="text-xs">
            {modelName}
          </Badge>

          {/* TTFT */}
          {ttft !== null && (
            isCached ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] h-5">
                    <Zap className="w-3 h-3 mr-1" />
                    cached
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Response served from cache (instant)
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] h-5 font-mono tabular-nums cursor-help",
                      message.status === "generating" && "animate-pulse"
                    )}
                  >
                    {formatTTFT(ttft)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold">Time to First Token</div>
                    <div className="text-muted-foreground">
                      {message.status === "generating"
                        ? "AI started responding"
                        : "How long until the AI started responding"}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          )}

          {/* TPS (completed only) */}
          {message.tokensPerSecond && message.status === "complete" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 font-mono tabular-nums cursor-help"
                >
                  {Math.round(message.tokensPerSecond)} t/s
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-semibold">Tokens Per Second</div>
                  <div className="text-muted-foreground">
                    Generation speed: {Math.round(message.tokensPerSecond)} tokens/sec
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Error indicator */}
          {message.status === "error" && ttft !== null && (
            <Badge variant="destructive" className="text-[10px] h-5">
              <AlertCircle className="w-3 h-3" />
            </Badge>
          )}
        </div>
      )}

      {/* Screen reader announcement */}
      {!isUser && message.status === "complete" && (
        <div className="sr-only" role="status" aria-live="polite">
          {ttft && `Response generated in ${formatTTFT(ttft)}`}
          {message.tokensPerSecond && ` at ${Math.round(message.tokensPerSecond)} tokens per second`}
        </div>
      )}
    </div>
  );
}
```

---

## Success Metrics

**Before:**
- No visibility into model performance
- Users guess at which model is "faster"
- Hard to debug slow responses

**After:**
- Clear TTFT/TPS metrics on every message
- Informed model selection (data-driven)
- Quick identification of API latency vs model speed
- Comparison mode shows objective performance differences

---

## Implementation Time

**Estimated:** 3-4 hours

**Breakdown:**
- Schema changes: 15 min
- Timing capture in Convex action: 90 min
- Mutation updates: 30 min
- UI component changes: 60 min
- Testing & edge cases: 45 min

---

## Dependencies

- Tooltip component (exists: `src/components/ui/tooltip.tsx`)
- Badge component (exists: `src/components/ui/badge.tsx`)
- No other improvements required first
- Can implement independently

---

## Related Improvements

- **05-model-prominence.md** - Model name badge styling should match
- **07-accessibility.md** - Screen reader announcements coordinated
- **06-dynamic-empty-state.md** - Could show expected TTFT ranges per model type

---

## Notes

- TTFT measures API + network latency + model initialization
- TPS measures pure generation speed (after first token)
- Very fast models (GPT-4o-mini, Gemini Flash) often <200ms TTFT
- Thinking models (Claude Opus, o1) may have seconds of TTFT
- Cached responses should be <50ms TTFT
- Mobile: Ensure badges don't overflow on narrow screens
