# AI Model Reasoning System

**Status**: Production
**Last Updated**: 2025-12-07
**Implementation**: Unified Factory Pattern

---

## Overview

The reasoning system enables models to "think before responding" - showing intermediate reasoning steps to users. Different AI providers implement this differently (OpenAI's o-series uses `reasoning_effort`, Anthropic uses `thinking` budgets, Google uses `thinkingConfig`, DeepSeek uses tag extraction). Our implementation unifies all these approaches into a single declarative system.

**Key Principle**: Add new reasoning models via config only - no code changes to generation logic.

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
- Returns thinking in separate message role

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

**Effort Mapping**:
```typescript
// Level variant
levelMapping: { low: "low", medium: "medium", high: "high" }

// Budget variant
budgetMapping: { low: 5000, medium: 15000, high: 30000 }
```

**Token Tracking**: No separate reasoning tokens (included in output)

### DeepSeek (Tag extraction)

**API**: Custom middleware extracts `<think>` tags
**Models**: deepseek-v3 (via OpenRouter)
**Config Type**: `deepseek-tag-extraction`

**Special Handling**:
- Not a native API parameter
- Uses Vercel AI SDK's `wrapLanguageModel` middleware
- Extracts content between `<think>...</think>` tags
- Displays extracted thinking in UI, removes from final output

**Implementation**:
```typescript
applyMiddleware: (model) =>
  wrapLanguageModel({
    model,
    middleware: extractReasoningMiddleware("think"),
  })
```

**Token Tracking**: Thinking tokens counted in output (not separated by API)

### Generic Pattern (xAI, Perplexity, Groq)

**API**: Simple `reasoningEffort`/`reasoningMode`/`reasoningLevel` parameter
**Models**: grok-4+, sonar-*, qwen3-32b
**Config Type**: `generic-reasoning-effort`

**Special Handling**:
- Maps user effort directly to provider parameter name
- No complex budgets or headers
- Covers 95% of new providers

**Config Example**:
```typescript
{
  type: "generic-reasoning-effort",
  parameterName: "reasoningEffort", // or "thinkingLevel", "reasoningMode", etc.
}
```

**Effort Mapping**: Direct passthrough (low → low, medium → medium, high → high)

---

## Current Model Support

### Production Models (18 total)

**OpenAI (3)**:
- gpt-5, gpt-5-pro, gpt-5.1 → `openai-reasoning-effort`

**Anthropic (2)**:
- claude-opus-4-5, claude-sonnet-4-5 → `anthropic-extended-thinking`

**Google (4)**:
- gemini-3-pro, gemini-3-deep-think → `google-thinking-level`
- gemini-2.5-flash, gemini-2.5-pro → `google-thinking-budget`
- gemini-3-pro-image-preview (image gen) → `google-thinking-level`

**xAI (4)**:
- grok-4, grok-4-vision, grok-4-mini, grok-code-fast-1 → `generic-reasoning-effort`

**Perplexity (4)**:
- sonar-pro, sonar-medium, sonar-reasoning, sonar-reasoning-online → `generic-reasoning-effort`

**OpenRouter (1)**:
- deepseek-v3 → `deepseek-tag-extraction`

**Groq (1)**:
- qwen3-32b → `generic-reasoning-effort`

---

## Adding New Models

### Simple Provider (95% of cases)

**If provider supports**: `reasoningEffort`, `thinkingLevel`, `reasoningMode`, or similar simple parameter:

```typescript
// In src/lib/ai/models.ts
{
  id: "newprovider:thinking-model",
  provider: "newprovider",
  name: "Thinking Model",
  // ... other fields
  reasoning: {
    type: "generic-reasoning-effort",
    parameterName: "reasoningLevel", // whatever the API uses
  },
}
```

**That's it.** No code changes needed. Generation logic automatically dispatches to generic handler.

### Complex Provider (5% of cases)

**If provider has**: Custom headers, token budgets, middleware, or non-standard API:

1. **Add new type** to `src/lib/ai/reasoning/types.ts`:
```typescript
export type ReasoningConfig =
  | { /* existing types */ }
  | {
      type: "newprovider-custom-reasoning";
      customField: string;
      budgetMapping: Record<ThinkingEffort, number>;
    };
```

2. **Create handler** at `src/lib/ai/reasoning/handlers/newprovider.ts`:
```typescript
import type { ReasoningHandler } from "../types";

export const buildNewProviderReasoning: ReasoningHandler = (config, effort) => {
  if (config.type !== "newprovider-custom-reasoning") return {};

  return {
    providerOptions: {
      newprovider: {
        customParam: config.customField,
        budget: config.budgetMapping[effort],
      },
    },
    headers: {
      "X-Custom-Header": "value",
    },
  };
};
```

3. **Register handler** in `src/lib/ai/reasoning/registry.ts`:
```typescript
import { buildNewProviderReasoning } from "./handlers/newprovider";

export const REASONING_HANDLERS: Record<ReasoningConfig["type"], ReasoningHandler> = {
  // ... existing handlers
  "newprovider-custom-reasoning": buildNewProviderReasoning,
};
```

4. **Add to model config**:
```typescript
{
  id: "newprovider:model",
  reasoning: {
    type: "newprovider-custom-reasoning",
    customField: "value",
    budgetMapping: { low: 5000, medium: 15000, high: 30000 },
  },
}
```

**TypeScript enforces**: All types in union must be handled (compile error if missing).

---

## UI Integration

### User-Facing Controls

**Thinking Effort Selector** (`src/components/chat/ComparisonModelSelector.tsx`, `ImageGenerateButton.tsx`):
```tsx
{supportsThinking && (
  <Select value={effort} onValueChange={setEffort}>
    <SelectItem value="low">Low - Fast</SelectItem>
    <SelectItem value="medium">Medium - Balanced</SelectItem>
    <SelectItem value="high">High - Deep Analysis</SelectItem>
  </Select>
)}
```

**Visibility Logic**:
```typescript
const modelConfig = getModelConfig(selectedModelId);
const supportsThinking = !!modelConfig?.reasoning;
```

### Display Components

**Reasoning Block** (`src/components/chat/ReasoningBlock.tsx`):
- Collapsible section showing thinking process
- Streams partial reasoning in real-time (`partialReasoning` field)
- Shows final reasoning on completion
- Displays token count + cost

**Message States**:
- `thinkingStartedAt`: When thinking began
- `partialReasoning`: Accumulated reasoning text (streaming)
- `reasoning`: Final complete reasoning (on completion)
- `reasoningTokens`: Token count for cost tracking
- `thinkingCompletedAt`: When thinking finished

---

## Database Schema

### Message Fields

```typescript
messages: defineTable({
  // ... existing fields

  // Reasoning/Thinking
  reasoning: v.optional(v.string()),           // Final thinking output
  reasoningTokens: v.optional(v.number()),     // Token count
  thinkingStartedAt: v.optional(v.number()),   // Timestamp
  thinkingCompletedAt: v.optional(v.number()), // Timestamp
  partialReasoning: v.optional(v.string()),    // Streaming accumulator
})
```

### Mutations

**Start Thinking**:
```typescript
markThinkingStarted({ messageId })
// Sets: thinkingStartedAt, clears partialReasoning
```

**Update Partial** (streaming):
```typescript
updatePartialReasoning({ messageId, partialReasoning })
// Updates: partialReasoning field (throttled to 200ms)
```

**Complete Thinking**:
```typescript
completeThinking({ messageId, reasoning, reasoningTokens })
// Sets: reasoning, reasoningTokens, thinkingCompletedAt
// Clears: partialReasoning
```

---

## Generation Integration

### Text Generation (`convex/generation.ts`)

**Before streaming**:
```typescript
const reasoningResult = args.thinkingEffort && modelConfig.reasoning
  ? buildReasoningOptions(modelConfig, args.thinkingEffort)
  : null;

if (reasoningResult) {
  await ctx.runMutation(internal.messages.markThinkingStarted, {
    messageId: args.messageId,
  });
}
```

**During streaming**:
```typescript
for await (const chunk of result.fullStream) {
  if (chunk.type === "reasoning-delta") {
    reasoningBuffer += chunk.text;

    // Throttled updates (200ms)
    if (Date.now() - lastReasoningUpdate >= 200) {
      await ctx.runMutation(internal.messages.updatePartialReasoning, {
        messageId: args.messageId,
        partialReasoning: reasoningBuffer,
      });
      lastReasoningUpdate = Date.now();
    }
  }
}
```

**After streaming**:
```typescript
const reasoningOutputs = await result.reasoning;
const finalReasoning = reasoningOutputs?.map((r) => r.text).join("\n");

if (finalReasoning) {
  await ctx.runMutation(internal.messages.completeThinking, {
    messageId: args.messageId,
    reasoning: finalReasoning,
    reasoningTokens: usage.reasoningTokens || 0,
  });
}
```

### Image Generation (`convex/generation/image.ts`)

**Same pattern** as text generation:
- Supports thinking for Gemini 3 Pro Image Preview
- Streams reasoning-delta chunks during generation
- Displays thinking while image generates
- Image appears after thinking completes

**Key difference**: Uses `streamText()` instead of `generateText()` to enable streaming (Gemini 3 Pro Image returns files after stream completes).

---

## Cost Tracking

### Token Accounting

**Reasoning tokens** are tracked separately and charged at provider-specific rates:

**OpenAI**: `reasoningTokens` charged at output rate (same as completion tokens)
```typescript
cost = (inputTokens * inputRate) + (outputTokens * outputRate) + (reasoningTokens * outputRate)
```

**Anthropic**: `reasoningTokens` charged at 50% of output rate
```typescript
cost = (inputTokens * inputRate) + (outputTokens * outputRate) + (reasoningTokens * 0.5 * outputRate)
```

**Google**: No separate reasoning tokens (included in output count)
```typescript
cost = (inputTokens * inputRate) + (outputTokens * outputRate)
```

**Implementation** (`src/lib/ai/pricing.ts`):
```typescript
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens?: number,
  reasoningTokens?: number,
): number {
  const model = getModelConfig(modelId);
  if (!model) return 0;

  const { input, output, cached, reasoning } = model.pricing;

  let cost = (inputTokens / 1_000_000) * input;
  cost += (outputTokens / 1_000_000) * output;

  if (cachedTokens && cached) {
    cost += (cachedTokens / 1_000_000) * cached;
  }

  if (reasoningTokens && reasoning) {
    cost += (reasoningTokens / 1_000_000) * reasoning;
  }

  return cost;
}
```

---

## Testing Strategy

### Validation Checklist

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

### Manual Test Script

```bash
# 1. Test OpenAI (o-series)
# Select gpt-5, set effort to "high", ask: "Solve: x^2 + 5x + 6 = 0"
# Verify: Thinking appears, shows work, correct answer

# 2. Test Anthropic (Claude extended thinking)
# Select claude-sonnet-4-5, set effort to "high", ask: "Explain quantum entanglement"
# Verify: Thinking budget applied, detailed reasoning

# 3. Test Google (Gemini)
# Select gemini-3-pro, set effort to "medium", ask: "Compare React vs Vue"
# Verify: Thinking level applied, structured analysis

# 4. Test Image Generation
# Select gemini-3-pro-image-preview, enable thinking, prompt: "Mountain sunset"
# Verify: Thinking streams, image appears after

# 5. Test Generic (xAI/Groq/Perplexity)
# Select grok-4, set effort to "low", ask: "What is AI?"
# Verify: Parameter passed correctly, quick response
```

---

## Troubleshooting

### Common Issues

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

### Debug Logging

**Enable verbose logs**:
```typescript
// In builder.ts
console.log("[Reasoning] Model:", modelConfig.id);
console.log("[Reasoning] Effort:", effort);
console.log("[Reasoning] Config:", modelConfig.reasoning);
console.log("[Reasoning] Result:", result);
```

**Check stream chunks**:
```typescript
// In generation.ts
for await (const chunk of result.fullStream) {
  console.log("[Stream Chunk]", chunk.type, chunk);
}
```

---

## Future Enhancements

### Potential Improvements

**1. Reasoning Templates**
- Pre-configured thinking styles (analytical, creative, step-by-step)
- User can select template + effort level
- Templates map to provider-specific prompts

**2. Reasoning Budget UI**
- Show token budget in real-time (e.g., "Using 12,000 / 30,000 tokens")
- Allow users to set custom budgets
- Warn when approaching limit

**3. Reasoning Cache**
- Cache reasoning for repeated queries
- "You asked this before, here's what I thought..."
- Reduces cost for similar questions

**4. Multi-Turn Reasoning**
- Chain of thought across messages
- References previous reasoning
- "Building on earlier analysis..."

**5. Reasoning Interruption**
- Stop button during thinking
- Partial reasoning still saved
- Resume from checkpoint

### Migration Considerations

**If Vercel AI SDK changes reasoning API**:
1. Update handler implementation (not model configs)
2. Types remain stable (discriminated unions)
3. Registry dispatch unchanged
4. Test with one provider first, rollout gradually

**If new provider pattern emerges**:
1. Add new type to `ReasoningConfig` union
2. Create handler in `handlers/`
3. Register in `registry.ts`
4. Update compatibility docs

**If reasoning becomes standard**:
- May deprecate `reasoning` field (all models support)
- Keep handlers for backwards compatibility
- UI always shows thinking selector

---

## References

**Implementation Files**:
- Types: `src/lib/ai/reasoning/types.ts`
- Handlers: `src/lib/ai/reasoning/handlers/*.ts`
- Registry: `src/lib/ai/reasoning/registry.ts`
- Builder: `src/lib/ai/reasoning/builder.ts`
- Text Gen: `convex/generation.ts` (lines 289-524)
- Image Gen: `convex/generation/image.ts` (lines 30-260)

**Provider Docs**:
- OpenAI: https://platform.openai.com/docs/guides/reasoning
- Anthropic: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
- Google: https://ai.google.dev/gemini-api/docs/thinking
- DeepSeek: https://api-docs.deepseek.com/guides/reasoning
- Vercel AI SDK: https://sdk.vercel.ai/docs/ai-sdk-core/reasoning

**Related Features**:
- Cost tracking: `src/lib/ai/pricing.ts`
- Model config: `src/lib/ai/models.ts`
- Message schema: `convex/schema.ts`
- UI components: `src/components/chat/ReasoningBlock.tsx`

---

**Implementation Status**: ✅ Production (all phases complete)
**Maintenance**: Add new models via config only - no code changes needed
