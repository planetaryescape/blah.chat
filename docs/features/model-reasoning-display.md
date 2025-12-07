# Model Reasoning Display

**Feature Status:** Production Ready
**Implementation Date:** December 2025
**Version:** 1.0

---

## Overview

The Model Reasoning Display feature enables blah.chat to capture, store, and display the internal "thinking" or "reasoning" process from advanced AI models that support extended reasoning capabilities. This feature provides transparency into how models like OpenAI o1/o3, Claude with extended thinking, and DeepSeek R1 arrive at their answers.

### Why This Feature Exists

Modern reasoning models spend additional time analyzing problems before responding. This "thinking" process can be valuable for users to understand the model's approach, verify its logic, and learn from its problem-solving methods. The feature balances transparency with usability by making reasoning visible but not overwhelming.

### Supported Models

- **OpenAI:** o1, o3, o4, o1-mini (summarized reasoning)
- **Anthropic:** Claude with extended thinking capability (condensed reasoning)
- **DeepSeek:** R1 and reasoning variants (full transparency via `<think>` tags)

---

## Core Design Decisions

### 1. Collapsible by Default

**Decision:** Reasoning sections are collapsed by default, showing only "Thought for X seconds" in the header.

**Rationale:**
- Reduces cognitive load for users who just want the answer
- Maintains clean UI without overwhelming the conversation
- Follows industry best practices from ChatGPT, Claude.ai, and Perplexity
- Easy one-click expansion for users interested in the reasoning process

### 2. Resilient Architecture

**Decision:** Reasoning content is streamed and persisted to the database, surviving page refreshes.

**Rationale:**
- Consistent with blah.chat's core resilient generation architecture
- Reasoning can take 10+ seconds; users may close tabs or refresh
- Valuable reasoning content should never be lost
- Enables future features like reasoning history and analysis

### 3. Real-Time Streaming

**Decision:** Stream reasoning content progressively as the model generates it, with throttled DB updates (200ms intervals).

**Rationale:**
- Provides live feedback during long thinking periods
- Reduces perceived latency
- Aligns with streaming main content behavior
- Minimizes database write operations while maintaining responsiveness

### 4. Visual Differentiation

**Decision:** Use monospace font, subtle muted backgrounds, and distinct styling for reasoning sections.

**Rationale:**
- Clearly distinguishes reasoning from main response
- Monospace suggests "internal process" or "system output"
- Maintains blah.chat's design philosophy (distinctive, not generic)
- Accessible without being distracting

### 5. User Control via Preferences

**Decision:** Implement three user preferences for reasoning display behavior.

**Rationale:**
- Different users have different needs (learning vs efficiency)
- Power users may want auto-expanded reasoning
- Some users may prefer minimal UI and hide reasoning entirely
- Preferences persist across sessions for consistent experience

---

## Architecture

### Data Flow

```
1. User sends message → Assistant message created with status "pending"
2. If reasoning model + thinkingEffort set → Mark thinking started (timestamp)
3. Stream reasoning deltas → Update partialReasoning (throttled 200ms)
4. Thinking completes → Mark thinking completed (timestamp)
5. Extract final reasoning → Store in reasoning field
6. Stream main response → Update partialContent (throttled 200ms)
7. Generation completes → Store final content + reasoning + tokens + cost
```

### Database Schema

```typescript
messages: {
  // Standard fields
  content: string
  partialContent?: string

  // Reasoning fields
  reasoning?: string              // Final reasoning content
  partialReasoning?: string       // Streaming reasoning
  reasoningTokens?: number        // Tokens used for reasoning (cost tracking)

  // Timing
  thinkingStartedAt?: number      // When thinking began
  thinkingCompletedAt?: number    // When thinking ended
}

users.preferences: {
  reasoning?: {
    showByDefault?: boolean       // Show reasoning sections (default: true)
    autoExpand?: boolean          // Auto-expand on load (default: false)
    showDuringStreaming?: boolean // Show while generating (default: true)
  }
}
```

### Component Structure

```
ChatMessage
  └─ ReasoningBlock (if reasoning model)
      ├─ Trigger Button (collapsed state)
      │   ├─ Brain/Loader icon
      │   ├─ "Thought for X seconds" or "Thinking..."
      │   └─ ChevronDown (rotates when expanded)
      └─ Expandable Content (with Framer Motion)
          └─ Reasoning text (monospace, max-height 400px, scrollable)
```

---

## Model-Specific Implementation

### OpenAI o1/o3/o4

**Configuration:**
```typescript
options.providerOptions = {
  openai: {
    reasoningEffort: "low" | "medium" | "high"
  }
}
```

**Characteristics:**
- Returns **summarized** reasoning (not raw tokens)
- Reasoning effort controls depth and token usage
- `reasoningTokens` available in usage for cost calculation
- Summary is generated by OpenAI for safety/IP protection

**Implementation Note:** Access via `result.reasoning` from Vercel AI SDK.

---

### Anthropic Claude (Extended Thinking)

**Configuration:**
```typescript
options.providerOptions = {
  anthropic: {
    thinking: {
      type: "enabled",
      budgetTokens: 5000 | 15000 | 30000  // low | medium | high
    }
  }
}
options.headers = {
  "anthropic-beta": "interleaved-thinking-2025-05-14"
}
```

**Characteristics:**
- Returns **condensed** reasoning in content blocks
- Budget tokens controls thinking depth
- May encrypt/hide sensitive reasoning for safety
- Requires beta header for interleaved thinking

**Implementation Note:** Vercel AI SDK extracts thinking blocks to `result.reasoning`.

---

### DeepSeek R1

**Configuration:**
```typescript
const model = wrapLanguageModel({
  model: deepseek("deepseek-reasoner"),
  middleware: extractReasoningMiddleware({ tagName: "think" })
})
```

**Characteristics:**
- Most **transparent** - full chain-of-thought visible
- Outputs reasoning as text with `<think>...</think>` tags
- Middleware automatically parses and separates reasoning
- No summarization or condensation

**Implementation Note:** Use `extractReasoningMiddleware` from Vercel AI SDK to parse tags.

---

## User Preferences

### Show Reasoning Sections (default: true)

**When enabled:** Reasoning blocks are displayed for reasoning models
**When disabled:** Reasoning blocks are completely hidden

**Use case:** Users who find reasoning distracting or prefer minimal UI can disable entirely.

---

### Auto-Expand Reasoning (default: false)

**When enabled:** Reasoning sections automatically expand on load
**When disabled:** Reasoning sections default to collapsed state

**Use case:** Power users or learners who always want to see reasoning without clicking.

---

### Show During Streaming (default: true)

**When enabled:** Reasoning appears in real-time as model generates it
**When disabled:** Reasoning hidden until thinking completes

**Use case:** Users who find streaming distracting can wait for final reasoning.

---

## Cost Tracking

Reasoning tokens are tracked separately for accurate cost calculation:

```typescript
cost = (inputTokens * inputPrice) +
       (outputTokens * outputPrice) +
       (reasoningTokens * reasoningPrice)
```

**Note:** OpenAI charges for reasoning tokens at the same rate as input tokens. Claude's extended thinking tokens are included in output token count.

---

## Backend Implementation Details

### Key Mutations

**`markThinkingStarted`**
- Sets `thinkingStartedAt` timestamp
- Updates status to "generating"
- Called when reasoning model begins thinking

**`updatePartialReasoning`**
- Updates `partialReasoning` field
- Throttled to 200ms intervals
- Called during reasoning streaming

**`completeThinking`**
- Sets `thinkingCompletedAt` timestamp
- Stores final `reasoning` content
- Stores `reasoningTokens` for cost tracking
- Clears `partialReasoning`

**`completeMessage`**
- Extended to accept `reasoning` and `reasoningTokens` parameters
- Stores both main response and reasoning
- Calculates total cost including reasoning tokens

### Streaming Logic

```typescript
// Separate streams for reasoning and content
for await (const chunk of result.fullStream) {
  if (chunk.type === "reasoning-delta") {
    // Accumulate reasoning
    // Throttled DB update every 200ms
  }
  if (chunk.type === "text-delta") {
    // Accumulate main content
    // Throttled DB update every 200ms
  }
}
```

---

## UI/UX Considerations

### Visual Hierarchy

1. **Reasoning block appears above main response** - establishes temporal sequence
2. **Subtle background differentiation** - visually distinct without being jarring
3. **Monospace font** - suggests "internal process" or "code-like" content
4. **Muted colors** - secondary to main response

### Animations

**Thinking State:**
- Pulsing background on trigger button
- Spinning loader icon
- Live timer showing elapsed seconds

**Expand/Collapse:**
- Smooth height transition (200ms)
- Chevron rotation
- Framer Motion for fluid animation

### Mobile Responsiveness

- Full-width trigger button
- Adequate touch targets (44px+)
- Scrollable content within max-height
- Readable monospace text size

---

## Future Enhancement Considerations

### 1. Reasoning Analytics

**Potential:** Track and analyze reasoning patterns across conversations
- Average thinking duration by model
- Reasoning token usage trends
- Correlation between reasoning depth and response quality

**Implementation:** Aggregate reasoning metadata in analytics pipeline.

---

### 2. Persistent Thinking Indicator

**Potential:** Show "💡 Thinking" badge when reasoning mode is active for a conversation

**Rationale:** Help users understand why responses take longer (following Claude.ai pattern).

**Implementation:** Add indicator to conversation header or chat input based on selected model + thinkingEffort.

---

### 3. "Think" Button Quick Toggle

**Potential:** One-click button in chat input to enable reasoning for next message

**Rationale:** Easier than navigating to model settings (following ChatGPT pattern).

**Implementation:** State toggle that temporarily overrides model selection with reasoning variant.

---

### 4. Reasoning Search

**Potential:** Search through historical reasoning content, not just main responses

**Implementation:** Index `reasoning` field in hybrid search, add filter for "reasoning only" search.

---

### 5. Reasoning Export

**Potential:** Export reasoning separately for analysis or learning

**Implementation:** Include reasoning in conversation export formats (JSON, Markdown, PDF).

---

## Testing Guidelines

### Manual Testing Checklist

**OpenAI o1/o3:**
- [ ] Reasoning captured and displayed
- [ ] Duration calculated correctly
- [ ] Reasoning tokens tracked
- [ ] Collapsed/expanded toggle works

**Claude Extended Thinking:**
- [ ] Extended thinking enabled with beta header
- [ ] Reasoning content extracted
- [ ] Budget levels work (low/medium/high)
- [ ] Hidden reasoning message displayed when encrypted

**DeepSeek R1:**
- [ ] `<think>` tags parsed correctly
- [ ] Reasoning separated from response
- [ ] No raw tags shown in UI

**Resilience:**
- [ ] Page refresh during thinking preserves partial reasoning
- [ ] Page refresh after completion preserves full reasoning
- [ ] Timer continues from correct timestamp on reload

**User Preferences:**
- [ ] Toggle "Show reasoning" hides/shows blocks
- [ ] Toggle "Auto-expand" changes initial state
- [ ] Toggle "Show during streaming" affects real-time display
- [ ] Preferences persist after refresh

---

## Maintenance Notes

### When Adding New Reasoning Models

1. Update model config in `src/lib/ai/models.ts`:
   ```typescript
   capabilities: ["thinking"] // or ["extended-thinking"]
   supportsThinkingEffort: true
   pricing: { reasoning: X.XX } // if applicable
   ```

2. Add model-specific configuration in `buildReasoningOptions` helper

3. If model uses tag-based reasoning (like DeepSeek), configure middleware:
   ```typescript
   middleware: extractReasoningMiddleware({ tagName: "YOUR_TAG" })
   ```

4. Test reasoning capture, display, and cost tracking

---

### Vercel AI SDK Updates

**Current Version:** 4.2+ (reasoning support introduced)

**Breaking Changes to Watch:**
- `result.reasoning` API changes
- `extractReasoningMiddleware` deprecation or updates
- Provider-specific reasoning format changes

**Migration Strategy:**
- Monitor Vercel AI SDK changelog
- Test reasoning models after SDK upgrades
- Keep fallback for models without reasoning support

---

### Database Considerations

**Field Sizes:**
- `reasoning` and `partialReasoning` are text fields (no practical limit in Convex)
- DeepSeek reasoning can be very long (5000+ tokens)
- Monitor database storage usage if reasoning becomes heavy

**Indexing:**
- Consider indexing `thinkingStartedAt`/`thinkingCompletedAt` if adding reasoning analytics
- No index needed for `reasoning` field unless implementing search

---

## Known Limitations

1. **OpenAI Summarization:** OpenAI o1/o3 returns summarized reasoning, not raw tokens. True internal reasoning is not visible for safety/IP reasons.

2. **Claude Encryption:** Some Claude reasoning may be encrypted/hidden if safety systems detect potential harm or misuse.

3. **Streaming Variability:** Not all providers support reasoning streaming. Some models only return reasoning after completion.

4. **Cost Transparency:** Reasoning tokens significantly increase costs. Users should be aware when enabling thinking effort.

---

## References

### Industry Patterns

- **ChatGPT:** Collapsed reasoning with "Thought for X seconds", shimmer animation during generation
- **Claude.ai:** Expandable thinking section with live timer, safety redaction
- **DeepSeek:** Full transparency with `<think>` tags, most visible reasoning
- **Perplexity:** Hidden by default, toggle in response header

### Technical Documentation

- [Vercel AI SDK Reasoning Support](https://vercel.com/blog/ai-sdk-4-2)
- [OpenAI Reasoning Models](https://platform.openai.com/docs/guides/reasoning)
- [Claude Extended Thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking)
- [DeepSeek Reasoning API](https://api-docs.deepseek.com/guides/reasoning_model)

---

## Changelog

### v1.0 (December 2025)
- Initial implementation with OpenAI o1/o3, Claude extended thinking, DeepSeek R1
- Collapsible UI with streaming support
- User preferences for display behavior
- Cost tracking for reasoning tokens
- Resilient architecture (survives page refresh)
