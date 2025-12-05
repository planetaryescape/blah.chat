# Phase 12: Response Comparison & Consolidation

**Goal**: Side-by-side multi-model comparison with voting and intelligent consolidation for research workflows.

**Status**: Ready to start
**Dependencies**: All previous phases (working chat, multi-model support, cost tracking)
**Estimated Effort**: ~14-21 hours for MVP

---

## Overview

Enable users to:
1. **Compare**: Send one prompt to 2-4 models simultaneously
2. **View**: See responses side-by-side with synchronized scrolling
3. **Vote**: Rate which response is better (for future LM Arena-style leaderboard)
4. **Consolidate**: Synthesize all responses into one comprehensive answer using a selected model

**Use Case**: Research mode - get diverse perspectives from multiple models, then consolidate insights into unified response.

**Test Flow**:
- User selects 3 models (GPT-4o, Claude Sonnet, Gemini Pro)
- Enters prompt: "Explain quantum computing to a 10-year-old"
- All 3 respond in parallel with live streaming
- Side-by-side view shows responses as they generate
- User votes: "Claude better"
- User clicks "Consolidate" → selects GPT-4o
- New chat opens with: "Here are 3 responses from [models] about [prompt]. [responses]. Consolidate this."
- GPT-4o generates unified answer

---

## Research Background

### Industry Patterns (LMSYS Arena, Perplexity)

**LMSYS Chatbot Arena** (lmarena.ai):
- Gold standard for LLM comparison
- 50/50 two-column layout
- Models anonymous until after voting
- Voting: Left Better | Right Better | Tie | Both Bad
- Reveals model names post-vote
- Powers global LLM leaderboard via Elo ratings

**Perplexity** (proposed feature):
- Multi-model "comparison mode"
- Checkbox selection → side-by-side results
- Challenges noted: latency (parallel queries), cost (N models), mobile responsiveness

**OpenAI Workbench**:
- Left: prompt/config panel
- Right: response panel
- Real-time updates, iterative testing

**Key Learnings**:
- 2-up most common (easy to compare)
- 3-4 models: grid layout desktop, tabs mobile
- Blind testing (hide names) reduces bias
- Voting UX: simple buttons below each response
- Cost warnings essential (N models = N costs)

### Synchronized Scrolling Research

**Libraries Evaluated**:
1. `react-scroll-sync` - Most popular (4 years old, unmaintained)
2. `use-scroll-sync` - Modern hooks-based alternative
3. `scroll-sync-react` - New rewrite addressing maintenance issues

**Decision**: Custom implementation (50 lines)
- Avoids dependency on unmaintained library
- Percentage-based sync (handles different content heights)
- `requestAnimationFrame` throttling (60fps, smooth)
- Passive event listeners (mobile performance)

**Technical Approach**:
```typescript
// Sync scroll percentage across refs
const scrollPercent = el.scrollTop / (el.scrollHeight - el.clientHeight);
otherPanels.forEach(panel => {
  panel.scrollTop = scrollPercent * (panel.scrollHeight - panel.clientHeight);
});
```

**Performance Considerations**:
- Use refs (not state) to avoid re-renders
- RAF throttle prevents jank
- Passive listeners: Chrome reduced scroll latency 400ms → 250ms
- Percentage-based handles dynamic height changes during streaming

### blah.chat Existing Architecture

**Message Rendering**:
- `MessageList.tsx`: Container with auto-scroll hook
- `ChatMessage.tsx`: Memoized message component with glassmorphic styling
- `MarkdownContent.tsx`: Streaming reveal (10 chars/30ms)
- Auto-scroll: Respects user scroll position, shows scroll-to-bottom button

**Resilient Generation**:
- Convex actions persist generation server-side
- Messages have status: `pending` | `generating` | `complete` | `error`
- `partialContent` field stores streaming updates
- Client subscribes reactively - survives page refresh
- Cost tracked per message: `inputTokens`, `outputTokens`, `cost`

**Schema Ready**:
- `comparisonGroupId` field exists in messages table (line 142)
- Indexed: `by_comparison_group`
- Just needs to be used

---

## Architecture Design

### Component Hierarchy

```
ComparisonView (container)
├── Header
│   ├── "Comparing N models" title
│   ├── Sync toggle (enable/disable scroll sync)
│   └── Exit button (back to normal chat)
├── Grid / Tabs (responsive)
│   ├── ComparisonPanel (Model 1)
│   │   ├── Header: Model badge + cost/tokens
│   │   ├── Content: Reuse ChatMessage/MarkdownContent
│   │   └── Footer: VotingControls
│   ├── ComparisonPanel (Model 2)
│   └── ComparisonPanel (Model N)
└── Footer
    ├── Aggregate cost display
    ├── VotingControls (global tie/both bad)
    └── Consolidate button (appears when all complete)

ConsolidateDialog
├── Model selector dropdown
├── Preview: "Will create prompt with ~15,000 tokens"
├── Cost estimate
└── Confirm button
```

### Data Flow

**1. Starting Comparison**:
```
User clicks compare icon in ChatInput
    ↓
ModelSelector popover opens
    ↓
User checks 2-4 models
    ↓
Shows estimate: "$0.015 total"
    ↓
User types prompt, clicks "Compare N models"
    ↓
sendMessage mutation ({ models: ["gpt-4o", "claude-3.5-sonnet", "gemini-pro"], content: "..." })
    ↓
Backend generates comparisonGroupId (UUID)
    ↓
Inserts 1 user message
    ↓
Inserts N pending assistant messages with same comparisonGroupId
    ↓
Schedules N parallel generateResponse actions
    ↓
Client subscribes to messages query
    ↓
MessageList detects comparisonGroupId → renders ComparisonView
    ↓
Each panel shows live streaming updates
    ↓
All complete → voting UI appears
```

**2. Voting**:
```
User clicks "This Better" on Claude panel
    ↓
recordVote mutation ({ comparisonGroupId, winnerId, rating: "right_better" })
    ↓
Inserts into votes table
    ↓
Embeds vote in message records (dual persistence)
    ↓
UI shows checkmark on voted response
```

**3. Consolidation**:
```
User clicks "Consolidate Responses"
    ↓
ConsolidateDialog opens
    ↓
User selects model (e.g., GPT-4o)
    ↓
Preview shows: "~15,234 input tokens, $0.023 est"
    ↓
User clicks "Consolidate with GPT-4o"
    ↓
createConsolidationConversation mutation
    ↓
Fetches all comparison messages
    ↓
Builds consolidated prompt:
  "Here are 3 responses from [models] about:
   **Original:** [prompt]
   **Response from Model 1:** [content]
   **Response from Model 2:** [content]
   **Response from Model 3:** [content]
   Can you consolidate all of this?"
    ↓
Creates new conversation
    ↓
Inserts user message with consolidated prompt
    ↓
Inserts pending assistant message
    ↓
Schedules generation action
    ↓
Navigates to new conversation (router.push)
    ↓
New chat shows consolidated response streaming in
```

### Mobile Strategy

**Breakpoint**: `1024px` (lg)

**Desktop (≥1024px)**:
```tsx
<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
  <ComparisonPanel ref={register} model="gpt-4o" />
  <ComparisonPanel ref={register} model="claude" />
  <ComparisonPanel ref={register} model="gemini" />
</div>
```
- Side-by-side grid
- Synchronized scrolling enabled
- Equal column widths

**Mobile (<1024px)**:
```tsx
<Tabs defaultValue={messages[0]._id}>
  <TabsList className="sticky top-0">
    <TabsTrigger value="model-1">GPT-4o</TabsTrigger>
    <TabsTrigger value="model-2">Claude</TabsTrigger>
  </TabsList>
  <TabsContent value="model-1">
    <ComparisonPanel model="gpt-4o" />
  </TabsContent>
  <TabsContent value="model-2">
    <ComparisonPanel model="claude" />
  </TabsContent>
</Tabs>
```
- Tabs with swipe gestures
- One model visible at a time
- No scroll sync (not applicable)

---

## Implementation Steps

### Step 1: Backend - Convex Schema & Mutations

**File: `convex/schema.ts`**

Add votes table:
```typescript
votes: defineTable({
  userId: v.id("users"),
  comparisonGroupId: v.string(),
  winnerId: v.optional(v.id("messages")), // null for tie
  rating: v.union(
    v.literal("left_better"),
    v.literal("right_better"),
    v.literal("tie"),
    v.literal("both_bad")
  ),
  votedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_comparison", ["comparisonGroupId"])
```

Add user preference:
```typescript
preferences: v.object({
  // ...existing
  showModelNamesDuringComparison: v.optional(v.boolean()), // default false
})
```

**File: `convex/chat.ts`**

Modify sendMessage mutation:
```typescript
export const sendMessage = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
    model: v.optional(v.string()), // Single model (backwards compat)
    models: v.optional(v.array(v.string())), // NEW: Array for comparison
    thinkingEffort: v.optional(v.union(...)),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Determine models to use
    const modelsToUse = args.models || [args.model || user.preferences.defaultModel];

    // Generate comparison group ID if multiple models
    const comparisonGroupId = modelsToUse.length > 1
      ? crypto.randomUUID()
      : undefined;

    // Get or create conversation
    let conversationId = args.conversationId;
    if (!conversationId) {
      conversationId = await ctx.runMutation(
        internal.conversations.createInternal,
        {
          userId: user._id,
          model: modelsToUse[0], // Primary model
          title: "New Chat",
        }
      );
    }

    // Insert user message (single)
    await ctx.runMutation(internal.messages.create, {
      conversationId,
      userId: user._id,
      role: "user",
      content: args.content,
      attachments: args.attachments,
      status: "complete",
    });

    // Insert N pending assistant messages
    const assistantMessageIds: Id<"messages">[] = [];

    for (const model of modelsToUse) {
      const msgId = await ctx.runMutation(internal.messages.create, {
        conversationId,
        userId: user._id,
        role: "assistant",
        status: "pending",
        model,
        comparisonGroupId, // Link all responses
      });
      assistantMessageIds.push(msgId);

      // Schedule generation action
      await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
        conversationId,
        assistantMessageId: msgId,
        modelId: model,
        userId: user._id,
        thinkingEffort: args.thinkingEffort,
      });
    }

    // Increment daily message count
    await ctx.db.patch(user._id, {
      dailyMessageCount: (user.dailyMessageCount || 0) + 1,
    });

    // Update conversation timestamp
    await ctx.runMutation(internal.conversations.updateLastMessageAt, {
      conversationId,
    });

    return {
      conversationId,
      assistantMessageIds,
      comparisonGroupId,
    };
  },
});
```

**File: `convex/messages.ts`**

Add query to fetch comparison group:
```typescript
export const getComparisonGroup = query({
  args: { comparisonGroupId: v.string() },
  handler: async (ctx, { comparisonGroupId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("messages")
      .withIndex("by_comparison_group", q =>
        q.eq("comparisonGroupId", comparisonGroupId)
      )
      .collect();
  },
});
```

**File: `convex/votes.ts` (NEW)**

Create vote recording mutation:
```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUserOrCreate } from "./lib/userSync";

export const recordVote = mutation({
  args: {
    comparisonGroupId: v.string(),
    winnerId: v.optional(v.id("messages")),
    rating: v.union(
      v.literal("left_better"),
      v.literal("right_better"),
      v.literal("tie"),
      v.literal("both_bad")
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // 1. Insert into votes table (for analytics)
    await ctx.db.insert("votes", {
      userId: user._id,
      comparisonGroupId: args.comparisonGroupId,
      winnerId: args.winnerId,
      rating: args.rating,
      votedAt: Date.now(),
    });

    // 2. Embed in message records (dual persistence)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_comparison_group", q =>
        q.eq("comparisonGroupId", args.comparisonGroupId)
      )
      .collect();

    for (const msg of messages) {
      await ctx.db.patch(msg._id, {
        votes: {
          rating: args.rating,
          isWinner: msg._id === args.winnerId,
          votedAt: Date.now(),
        },
      });
    }

    return { success: true };
  },
});
```

**File: `convex/conversations.ts`**

Add consolidation mutation:
```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUserOrCreate } from "./lib/userSync";
import { buildConsolidationPrompt } from "../src/lib/consolidation";

export const createConsolidationConversation = mutation({
  args: {
    comparisonGroupId: v.string(),
    consolidationModel: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // 1. Fetch comparison messages
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_comparison_group", q =>
        q.eq("comparisonGroupId", args.comparisonGroupId)
      )
      .collect();

    // 2. Separate user message and assistant responses
    const userMessage = allMessages.find(m => m.role === "user");
    const responses = allMessages.filter(m => m.role === "assistant");

    if (!userMessage || responses.length === 0) {
      throw new Error("Invalid comparison group");
    }

    // 3. Build consolidation prompt
    const consolidationPrompt = buildConsolidationPrompt(
      userMessage.content,
      responses.map(r => ({ model: r.model || "unknown", content: r.content }))
    );

    // 4. Create new conversation
    const conversationId = await ctx.runMutation(
      internal.conversations.createInternal,
      {
        userId: user._id,
        model: args.consolidationModel,
        title: `Consolidation: ${userMessage.content.slice(0, 50)}...`,
      }
    );

    // 5. Insert user message with consolidated prompt
    await ctx.runMutation(internal.messages.create, {
      conversationId,
      userId: user._id,
      role: "user",
      content: consolidationPrompt,
      status: "complete",
    });

    // 6. Insert pending assistant message
    const assistantMessageId = await ctx.runMutation(
      internal.messages.create,
      {
        conversationId,
        userId: user._id,
        role: "assistant",
        status: "pending",
        model: args.consolidationModel,
      }
    );

    // 7. Schedule generation
    await ctx.scheduler.runAfter(
      0,
      internal.generation.generateResponse,
      {
        conversationId,
        assistantMessageId,
        modelId: args.consolidationModel,
        userId: user._id,
      }
    );

    return { conversationId };
  },
});
```

---

### Step 2: Hooks - State & Scroll Management

**File: `src/hooks/useComparisonMode.ts` (NEW)**

```typescript
import { useState } from "react";

export function useComparisonMode() {
  const [isActive, setIsActive] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [activeComparisonId, setActiveComparisonId] = useState<string | null>(null);

  const startComparison = (models: string[]) => {
    if (models.length < 2) {
      throw new Error("Select at least 2 models");
    }
    if (models.length > 4) {
      throw new Error("Maximum 4 models allowed");
    }
    setSelectedModels(models);
    setIsActive(true);
  };

  const exitComparison = () => {
    setIsActive(false);
    setSelectedModels([]);
    setActiveComparisonId(null);
  };

  return {
    isActive,
    selectedModels,
    activeComparisonId,
    startComparison,
    exitComparison,
    setActiveComparisonId,
  };
}
```

**File: `src/hooks/useSyncedScroll.ts` (NEW)**

```typescript
import { useCallback, useRef } from "react";

export function useSyncedScroll(enabled: boolean = true) {
  const refs = useRef<Set<HTMLElement>>(new Set());
  const syncing = useRef(false);

  const register = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;

      refs.current.add(el);

      const handleScroll = () => {
        if (!enabled || syncing.current) return;

        syncing.current = true;

        // Calculate scroll percentage
        const scrollPercent =
          el.scrollTop / (el.scrollHeight - el.clientHeight);

        // Sync to other panels via RAF (60fps throttle)
        requestAnimationFrame(() => {
          refs.current.forEach(other => {
            if (other !== el) {
              other.scrollTop =
                scrollPercent * (other.scrollHeight - other.clientHeight);
            }
          });
          syncing.current = false;
        });
      };

      // Passive listener for mobile performance
      el.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        el.removeEventListener("scroll", handleScroll);
        refs.current.delete(el);
      };
    },
    [enabled]
  );

  return { register };
}
```

---

### Step 3: UI Components

Full component implementations provided in plan - see lines 1348-1955 for:
- `ComparisonPanel.tsx`
- `ComparisonView.tsx`
- `VotingControls.tsx`
- `ModelSelector.tsx`
- `ComparisonTrigger.tsx`
- `ConsolidateDialog.tsx`
- `src/lib/consolidation.ts`

---

### Step 4: Integration

**File: `src/components/chat/MessageList.tsx`**

Add grouping logic:
```typescript
const grouped = useMemo(() => {
  const regular: Doc<"messages">[] = [];
  const comparisons: Record<string, Doc<"messages">[]> = {};

  messages.forEach(msg => {
    if (msg.comparisonGroupId) {
      comparisons[msg.comparisonGroupId] ||= [];
      comparisons[msg.comparisonGroupId].push(msg);
    } else {
      regular.push(msg);
    }
  });

  return { regular, comparisons };
}, [messages]);

// Render mixed list
return (
  <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
    {grouped.regular.map((message, index) => (
      <ChatMessage key={message._id} message={message} nextMessage={grouped.regular[index + 1]} />
    ))}

    {Object.entries(grouped.comparisons).map(([id, msgs]) => (
      <ComparisonView
        key={id}
        messages={msgs}
        comparisonGroupId={id}
        showModelNames={user?.preferences?.showModelNamesDuringComparison ?? false}
        onVote={handleVote}
        onConsolidate={handleConsolidate}
      />
    ))}
  </div>
);
```

**File: `src/components/chat/ChatInput.tsx`**

Add ComparisonTrigger to toolbar and mode badge.

**File: `src/app/(main)/chat/[conversationId]/page.tsx`**

Integrate useComparisonMode hook, wire up handlers.

---

### Step 5: Settings Integration

**File: `src/app/(main)/settings/page.tsx`**

Add toggle for model name visibility during comparison.

---

## Edge Cases & Error Handling

### 1. Partial Completions
- Each message has independent status tracking
- ComparisonPanel shows per-panel status
- Voting enabled per-panel independently

### 2. Single Model Error
- Error stored in `message.error`, status = "error"
- ComparisonPanel renders error state for that panel only
- Other panels unaffected

### 3. Stop All Generations
- "Stop All" button in ComparisonView header
- Calls existing `stopGeneration` mutation
- Partial content preserved

### 4. Cost Warnings
- Show estimated cost BEFORE sending
- No hard limit, just warning

### 5. Mobile Scroll Sync Disabled
- Automatically disable sync on mobile (tabs)

### 6. Refresh Resilience
- All messages persisted to DB with `comparisonGroupId`
- MessageList auto-detects and renders ComparisonView
- Generating messages continue server-side

---

## Testing Checklist

### Backend Tests
- [ ] Send comparison with 2 models → verify `comparisonGroupId` generated
- [ ] Verify N pending messages created with same group ID
- [ ] Vote on comparison → verify dual persistence
- [ ] Consolidate → verify new conversation created

### Frontend Tests
- [ ] ComparisonTrigger opens ModelSelector
- [ ] ModelSelector enforces 2-4 model limit
- [ ] Desktop: side-by-side grid shows all panels
- [ ] Mobile: tabs render correctly
- [ ] Scroll sync works (desktop)
- [ ] Voting buttons appear when complete
- [ ] Aggregate cost display accurate
- [ ] "Consolidate" button appears when all complete

### Edge Case Tests
- [ ] Refresh mid-generation → messages restore
- [ ] One model errors → other panels unaffected
- [ ] Stop all → partial content preserved
- [ ] Very long responses → scroll sync handles dynamic heights

---

## Performance Considerations

- Convex handles reactive updates efficiently (batched)
- Limit to 4 models max
- RAF throttling for scroll sync → 60fps
- Passive event listeners → no scroll blocking
- React.memo for optimization

---

## Future Enhancements (Post-MVP)

- **LM Arena Leaderboard**: Aggregate votes for model rankings (~5-8 hours)
- **Per-action cancellation**: Stop individual models (~3-5 hours)
- **Comparison history**: Dedicated page showing past comparisons (~4-6 hours)
- **Model recommendations**: "You usually prefer Claude for X" (~3-5 hours)
- **Export comparisons**: Download side-by-side markdown/PDF (~2-3 hours)
- **Shareable comparison links**: Public view (~4-6 hours)
- **Consolidation presets**: Save custom templates (~2-3 hours)

---

## Dependencies & Prerequisites

### Required Before Starting
1. Phase 1-3 complete: Auth, chat, multi-model support working
2. Cost tracking: `inputTokens`, `outputTokens`, `cost` fields populated
3. Model config: `AVAILABLE_MODELS` list with pricing
4. Resilient generation: Messages survive page refresh
5. Convex schema: Up-to-date with `comparisonGroupId` field

### External Dependencies
- shadcn/ui components: Tabs, Dialog, Popover, Badge, Switch
- Framer Motion (already in project)
- No new npm packages needed

---

## Success Criteria

### MVP Complete When:
1. ✅ User can select 2-4 models and send comparison
2. ✅ Responses generate in parallel with live streaming
3. ✅ Desktop: side-by-side grid with synced scrolling
4. ✅ Mobile: tabs with swipe gestures
5. ✅ Voting works: clicks record to both tables
6. ✅ Cost displayed per model + aggregate
7. ✅ Consolidation creates new chat with formatted prompt
8. ✅ Refresh mid-generation → responses restore and complete
9. ✅ Settings toggle for model name visibility works
10. ✅ Error in one model doesn't break other panels

---

## Estimated Effort Breakdown

- **Backend** (Convex): ~3-4 hours
- **Hooks**: ~1-2 hours
- **Components**: ~5-7 hours
- **Integration**: ~2-3 hours
- **Consolidation**: ~1-2 hours
- **Polish & Testing**: ~2-3 hours

**Total: 14-21 hours for MVP with consolidation**

---

## Next Steps After Phase 12

1. **Analytics Dashboard** (Phase 13): Usage patterns, model popularity, cost trends
2. **Advanced Memory** (Phase 14): Project-scoped memories, memory search improvements
3. **Collaboration** (Phase 15): Share conversations, multi-user projects
4. **LM Arena Integration** (Phase 16): Public leaderboard, community voting

---

## References & Resources

### Research Sources
- [LMSYS Chatbot Arena](https://lmarena.ai/) - Industry standard
- [react-scroll-sync GitHub](https://github.com/okonet/react-scroll-sync)
- [Chrome Passive Events Blog](https://developer.chrome.com/blog/scrolling-intervention)

### Internal Documentation
- `docs/spec.md` - Full feature specification
- `docs/implementation/phase-3-multi-model.md` - Multi-model foundation
- `docs/implementation/phase-2a-resilient-chat.md` - Resilient generation pattern

### Related Code
- `src/components/chat/MessageList.tsx` - Message rendering
- `src/hooks/useAutoScroll.ts` - Auto-scroll pattern
- `convex/chat.ts` - Send message mutation to extend
- `convex/generation.ts` - Generation action (no changes needed)
