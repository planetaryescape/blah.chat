# AI Model Reasoning System

**Status**: Production
**Last Updated**: December 2025

---

## Overview

The reasoning system enables models to "think before responding" - showing intermediate reasoning steps to users. Different AI providers implement this differently (OpenAI's o-series uses `reasoning_effort`, Anthropic uses `thinking` budgets, Google uses `thinkingConfig`, DeepSeek uses tag extraction). Our implementation unifies all these approaches into a single declarative system.

**Key Principle**: Add new reasoning models via config only - no code changes to generation logic.

### Why This Feature Exists

Modern reasoning models spend additional time analyzing problems before responding. This "thinking" process can be valuable for users to understand the model's approach, verify its logic, and learn from its problem-solving methods. The feature balances transparency with usability by making reasoning visible but not overwhelming.

---

## Architecture

### Design Philosophy

**Problem Solved**: Originally, each provider's reasoning API required custom if-blocks in `convex/generation.ts` (58 lines for 17 models across 7 providers). Adding a new model meant editing generation logic.

**Solution**: Factory Pattern with discriminated union types. Models declare their reasoning capability in config, handlers map config types to provider-specific API calls, generation logic dispatches via registry (zero if-blocks).

### Data Flow

```
User selects "High" thinking effort
    ↓
Model Config (models.ts) has reasoning: { type: "openai-reasoning-effort", ... }
    ↓
Builder (builder.ts) calls buildReasoningOptions(modelConfig, "high")
    ↓
Registry (registry.ts) dispatches to OpenAI handler
    ↓
Handler (handlers/openai.ts) returns { providerOptions: { openai: { reasoningEffort: "high" } } }
    ↓
Generation (generation.ts) passes providerOptions to streamText()
    ↓
Vercel AI SDK sends { reasoning_effort: "high" } to OpenAI API
    ↓
Stream returns reasoning-delta chunks → stored in DB → displayed to user
```

### Component Breakdown

**1. Types** (`src/lib/ai/reasoning/types.ts`):
- `ReasoningConfig`: Discriminated union (6 variants, one per provider pattern)
- `ThinkingEffort`: User-facing levels (low/medium/high)
- `ReasoningHandler`: Function signature for handlers
- `ProviderOptions`: Type-safe output for API requests

**2. Handlers** (`src/lib/ai/reasoning/handlers/*.ts`):
- One file per provider pattern (OpenAI, Anthropic, Google, DeepSeek, generic)
- Converts user-level effort → provider-specific API params
- Returns structured options (providerOptions, headers, middleware)

**3. Registry** (`src/lib/ai/reasoning/registry.ts`):
- Maps `ReasoningConfig["type"]` → handler function
- TypeScript enforces completeness (all types must have handlers)
- Single dispatch point

**4. Builder** (`src/lib/ai/reasoning/builder.ts`):
- Entry point: `buildReasoningOptions(modelConfig, thinkingEffort)`
- Validates config exists, dispatches to registry, returns result
- Used by both text and image generation

---

## Provider Implementations

### OpenAI (o-series models)

**API**: `reasoning_effort` parameter (low/medium/high)
**Models**: gpt-5, gpt-5-pro, gpt-5.1
**Config Type**: `openai-reasoning-effort`

**Special Handling**:
- Uses Responses API (not Chat Completions)
- `useResponsesAPI: true` flag triggers different endpoint
- Optional `reasoningSummary: "brief" | "detailed"` controls output verbosity
- Returns **summarized** reasoning (not raw tokens) for safety/IP protection

**Effort Mapping**:
```typescript
effortMapping: { low: "low", medium: "medium", high: "high" }
```

**Token Tracking**: `usage.reasoningTokens` (charged at same rate as output)

### Anthropic (Claude extended thinking)

**API**: `thinking` object with `budgetTokens`
**Models**: claude-opus-4-5, claude-sonnet-4-5
**Config Type**: `anthropic-extended-thinking`

**Special Handling**:
- Requires beta header: `anthropic-beta: interleaved-thinking-2025-05-14`
- Token budget controls max thinking depth (5000/15000/30000)
- Returns **condensed** reasoning in content blocks
- May encrypt/hide sensitive reasoning for safety

**Effort Mapping**:
```typescript
budgetMapping: { low: 5000, medium: 15000, high: 30000 }
```

**Token Tracking**: `usage.reasoningTokens` (charged at 50% of output rate)

### Google (Gemini thinking)

**Two variants**:

1. **Thinking Level** (Gemini 3):
   - Config Type: `google-thinking-level`
   - API: `thinkingConfig.thinkingLevel` (low/medium/high)
   - Used by: gemini-3-pro, gemini-3-deep-think

2. **Thinking Budget** (Gemini 2.5):
   - Config Type: `google-thinking-budget`
   - API: `thinkingConfig.thinkingBudget` (token count)
   - Used by: gemini-2.5-flash, gemini-2.5-pro

**Special Handling**:
- `includeThoughts: true` returns thinking in response
- Thinking appears in `result.reasoning` (not separate chunks)

**Token Tracking**: No separate reasoning tokens (included in output)

### DeepSeek (Tag extraction)

**API**: Custom middleware extracts `<think>` tags
**Models**: deepseek-v3 (via OpenRouter)
**Config Type**: `deepseek-tag-extraction`

**Special Handling**:
- Not a native API parameter
- Uses Vercel AI SDK's `wrapLanguageModel` middleware
- Extracts content between `<think>...</think>` tags
- Most **transparent** - full chain-of-thought visible
- Displays extracted thinking in UI, removes from final output

**Implementation**:
```typescript
applyMiddleware: (model) =>
  wrapLanguageModel({
    model,
    middleware: extractReasoningMiddleware("think"),
  })
```

### Generic Pattern (xAI, Perplexity, Groq)

**API**: Simple `reasoningEffort`/`reasoningMode`/`reasoningLevel` parameter
**Models**: grok-4+, sonar-*, qwen3-32b
**Config Type**: `generic-reasoning-effort`

**Special Handling**:
- Maps user effort directly to provider parameter name
- No complex budgets or headers
- Covers 95% of new providers

---

## UI/UX Design

### Core Design Decisions

**1. Collapsible by Default**
Reasoning sections are collapsed by default, showing only "Thought for X seconds" in the header.
- Reduces cognitive load for users who just want the answer
- Maintains clean UI without overwhelming the conversation
- Follows industry best practices from ChatGPT, Claude.ai, and Perplexity
- Easy one-click expansion for users interested in the reasoning process

**2. Resilient Architecture**
Reasoning content is streamed and persisted to the database, surviving page refreshes.
- Consistent with blah.chat's core resilient generation architecture
- Reasoning can take 10+ seconds; users may close tabs or refresh
- Valuable reasoning content should never be lost

**3. Real-Time Streaming**
Stream reasoning content progressively as the model generates it, with throttled DB updates (200ms intervals).
- Provides live feedback during long thinking periods
- Reduces perceived latency
- Aligns with streaming main content behavior

**4. Visual Differentiation**
Use monospace font, subtle muted backgrounds, and distinct styling for reasoning sections.
- Clearly distinguishes reasoning from main response
- Monospace suggests "internal process" or "system output"
- Maintains blah.chat's design philosophy (distinctive, not generic)

### User Preferences

**Show Reasoning Sections** (default: true)
When disabled, reasoning blocks are completely hidden.

**Auto-Expand Reasoning** (default: false)
When enabled, reasoning sections automatically expand on load.

**Show During Streaming** (default: true)
When disabled, reasoning hidden until thinking completes.

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

### Animations

**Thinking State:**
- Pulsing background on trigger button
- Spinning loader icon
- Live timer showing elapsed seconds

**Expand/Collapse:**
- Smooth height transition (200ms)
- Chevron rotation
- Framer Motion for fluid animation

---

## Database Schema

### Message Fields

```typescript
messages: defineTable({
  // Reasoning fields
  reasoning: v.optional(v.string()),           // Final thinking output
  reasoningTokens: v.optional(v.number()),     // Token count
  thinkingStartedAt: v.optional(v.number()),   // Timestamp
  thinkingCompletedAt: v.optional(v.number()), // Timestamp
  partialReasoning: v.optional(v.string()),    // Streaming accumulator
})

users.preferences: {
  reasoning?: {
    showByDefault?: boolean       // Show reasoning sections (default: true)
    autoExpand?: boolean          // Auto-expand on load (default: false)
    showDuringStreaming?: boolean // Show while generating (default: true)
  }
}
```

### Mutations

**`markThinkingStarted`**: Sets `thinkingStartedAt`, clears partialReasoning

**`updatePartialReasoning`**: Updates `partialReasoning` (throttled to 200ms)

**`completeThinking`**: Sets `thinkingCompletedAt`, stores final `reasoning` and `reasoningTokens`, clears `partialReasoning`

---

## Cost Tracking

Reasoning tokens are tracked separately and charged at provider-specific rates:

**OpenAI**: `reasoningTokens` charged at output rate (same as completion tokens)
```typescript
cost = (inputTokens * inputRate) + (outputTokens * outputRate) + (reasoningTokens * outputRate)
```

**Anthropic**: `reasoningTokens` charged at 50% of output rate
```typescript
cost = (inputTokens * inputRate) + (outputTokens * outputRate) + (reasoningTokens * 0.5 * outputRate)
```

**Google**: No separate reasoning tokens (included in output count)

---

## Adding New Models

### Simple Provider (95% of cases)

If provider supports `reasoningEffort`, `thinkingLevel`, `reasoningMode`, or similar simple parameter:

```typescript
// In src/lib/ai/models.ts
{
  id: "newprovider:thinking-model",
  provider: "newprovider",
  name: "Thinking Model",
  reasoning: {
    type: "generic-reasoning-effort",
    parameterName: "reasoningLevel", // whatever the API uses
  },
}
```

**That's it.** No code changes needed. Generation logic automatically dispatches to generic handler.

### Complex Provider (5% of cases)

If provider has custom headers, token budgets, middleware, or non-standard API:

1. **Add new type** to `src/lib/ai/reasoning/types.ts`
2. **Create handler** at `src/lib/ai/reasoning/handlers/newprovider.ts`
3. **Register handler** in `src/lib/ai/reasoning/registry.ts`
4. **Add to model config**

TypeScript enforces: All types in union must be handled (compile error if missing).

---

## Testing Checklist

**Per-Provider Testing**:
- [ ] Low effort → minimal thinking
- [ ] Medium effort → balanced thinking
- [ ] High effort → deep analysis
- [ ] Reasoning streams in real-time (UI updates)
- [ ] Final reasoning stored correctly
- [ ] Token counts accurate
- [ ] Cost calculation includes reasoning tokens
- [ ] Page refresh mid-thinking → completes correctly

**Edge Cases**:
- [ ] Model with no reasoning config → no thinking UI
- [ ] Reasoning disabled by user → direct response
- [ ] Network error mid-thinking → error state, no partial data
- [ ] Very long reasoning (>10K tokens) → UI handles smoothly

**User Preferences**:
- [ ] Toggle "Show reasoning" hides/shows blocks
- [ ] Toggle "Auto-expand" changes initial state
- [ ] Toggle "Show during streaming" affects real-time display
- [ ] Preferences persist after refresh

---

## Troubleshooting

**Issue**: "Thinking..." spinner stuck, no reasoning appears
**Cause**: `markThinkingStarted` called but stream never returned reasoning chunks
**Fix**: Check provider supports reasoning for that model, verify API response format

**Issue**: Reasoning shows but cost doesn't include reasoning tokens
**Cause**: Model pricing config missing `reasoning` rate
**Fix**: Add `reasoning: X` to model's pricing object in `models.ts`

**Issue**: Type error "Property 'reasoning' does not exist"
**Cause**: Model config type doesn't include optional `reasoning` field
**Fix**: Ensure `ModelConfig` interface has `reasoning?: ReasoningConfig`

**Issue**: New provider's reasoning not working
**Cause**: Handler not registered in registry
**Fix**: Add handler to `REASONING_HANDLERS` map in `registry.ts`

---

## References

**Implementation Files**:
- Types: `src/lib/ai/reasoning/types.ts`
- Handlers: `src/lib/ai/reasoning/handlers/*.ts`
- Registry: `src/lib/ai/reasoning/registry.ts`
- Builder: `src/lib/ai/reasoning/builder.ts`
- Text Gen: `convex/generation.ts`
- Image Gen: `convex/generation/image.ts`
- UI: `src/components/chat/ReasoningBlock.tsx`

**Provider Docs**:
- [OpenAI Reasoning](https://platform.openai.com/docs/guides/reasoning)
- [Anthropic Extended Thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Google Gemini Thinking](https://ai.google.dev/gemini-api/docs/thinking)
- [DeepSeek Reasoning](https://api-docs.deepseek.com/guides/reasoning)
- [Vercel AI SDK Reasoning](https://sdk.vercel.ai/docs/ai-sdk-core/reasoning)
