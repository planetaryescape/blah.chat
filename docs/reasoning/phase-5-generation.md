# Phase 5: Update Generation Logic

**Estimated Time**: 30 minutes
**Prerequisites**: Phases 1-4 recommended (types, handlers, registry, model configs)
**File to Modify**: `convex/generation.ts`
**Lines to Replace**: 258-346 (89 lines → ~30 lines)

## Context

**Problem**: 58 lines of provider-specific if-blocks, duplicated logic, hard to extend.

**Solution**: Call `buildReasoningOptions()` - single unified flow for all providers.

## Architecture Overview

```
models.ts (Phase 4)
    ↓ config with reasoning field
generation.ts (THIS PHASE)
    ↓ calls buildReasoningOptions
builder.ts (Phase 3)
    ↓ looks up handler
handlers/* (Phase 2)
    ↓ returns provider options
```

## Implementation

### Step 1: Add Import

**File**: `convex/generation.ts`

**At top of file** (around line 15), **add**:

```typescript
import { buildReasoningOptions } from "@/lib/ai/reasoning";
```

### Step 2: Remove Old Logic (Lines 258-346)

**FIND** (around lines 258-346):

```typescript
// 8. Detect reasoning capability
const isReasoningModel =
  modelConfig?.supportsThinkingEffort ||
  modelConfig?.capabilities?.includes("thinking") ||
  modelConfig?.capabilities?.includes("extended-thinking");

// Use Responses API for OpenAI reasoning models to get summaries
const useResponsesAPI =
  args.thinkingEffort &&
  modelConfig?.provider === "openai" &&
  modelConfig?.supportsThinkingEffort;

// Get model from registry (with Responses API for OpenAI reasoning)
const model = getModel(args.modelId, useResponsesAPI);

const needsTagExtraction = args.modelId.includes("deepseek");

// Wrap DeepSeek models with middleware to extract <think> tags
let finalModel = model;
if (needsTagExtraction) {
  finalModel = wrapLanguageModel({
    model,
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  });
}

// 9. Build streamText options
const options: any = {
  model: finalModel,
  messages: allMessages,
};

// OpenAI reasoning effort (GPT-5, o1, o3)
if (
  args.thinkingEffort &&
  modelConfig?.supportsThinkingEffort &&
  modelConfig.provider === "openai"
) {
  console.log(
    `[OpenAI] Enabling reasoning effort: ${args.thinkingEffort} for model: ${args.modelId}`,
  );
  options.providerOptions = {
    openai: {
      reasoningEffort: args.thinkingEffort,
      reasoningSummary: "detailed",
    },
  };
}

// Anthropic extended thinking budget
if (
  args.thinkingEffort &&
  modelConfig?.capabilities.includes("extended-thinking")
) {
  const budgets = { low: 5000, medium: 15000, high: 30000 };
  options.providerOptions = {
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: budgets[args.thinkingEffort],
      },
    },
  };
  options.headers = {
    "anthropic-beta": "interleaved-thinking-2025-05-14",
  };
}

// Google Gemini thinking models (experimental - may need API verification)
if (
  args.thinkingEffort &&
  modelConfig?.capabilities?.includes("thinking") &&
  modelConfig.provider === "google"
) {
  console.log(
    `[Gemini] Thinking effort requested but implementation needs verification`,
  );
}

// Generic thinking models (xAI, Perplexity, Groq, etc.)
if (
  args.thinkingEffort &&
  modelConfig?.capabilities?.includes("thinking") &&
  !["openai", "anthropic", "google"].includes(modelConfig.provider)
) {
  console.warn(
    `[${modelConfig.provider}] Thinking effort requested but no specific implementation exists.`,
  );
}
```

### Step 3: Replace with Unified Logic

**REPLACE lines 258-346 with**:

```typescript
// 8. Build reasoning options (unified for all providers)
const reasoningResult = args.thinkingEffort && modelConfig.reasoning
  ? buildReasoningOptions(modelConfig, args.thinkingEffort)
  : null;

// 9. Get model (with Responses API if needed for OpenAI)
const model = getModel(args.modelId, reasoningResult?.useResponsesAPI);

// 10. Apply middleware (e.g., DeepSeek tag extraction)
const finalModel = reasoningResult?.applyMiddleware
  ? reasoningResult.applyMiddleware(model)
  : model;

// 11. Build streamText options
const options: any = {
  model: finalModel,
  messages: allMessages,
};

// 12. Apply provider options (single source!)
if (reasoningResult?.providerOptions) {
  options.providerOptions = reasoningResult.providerOptions;
  console.log(
    `[Reasoning] Applied provider options for ${args.modelId}:`,
    reasoningResult.providerOptions,
  );
}

// 13. Apply headers (e.g., Anthropic beta)
if (reasoningResult?.headers) {
  options.headers = reasoningResult.headers;
}

// 14. Detect if reasoning model (check config, not flags)
const isReasoningModel = !!modelConfig.reasoning;
```

**Result**: 89 lines → 30 lines (59 lines removed!)

### Step 4: Verify Rest of File Unchanged

**Ensure these sections remain the same**:
- Lines 1-257: System prompts, history, attachments (NO CHANGES)
- Lines 347+: Thinking phase tracking, streaming, completion (NO CHANGES)

**Only lines 258-346 changed** - everything else stays intact.

## Validation Checklist

- [ ] Import `buildReasoningOptions` added
- [ ] Old if-blocks removed (lines 258-346)
- [ ] New unified logic added (~30 lines)
- [ ] `reasoningResult` variable created
- [ ] `getModel()` uses `reasoningResult?.useResponsesAPI`
- [ ] Middleware applied via `reasoningResult?.applyMiddleware`
- [ ] Provider options applied from `reasoningResult?.providerOptions`
- [ ] Headers applied from `reasoningResult?.headers`
- [ ] `isReasoningModel` simplified to `!!modelConfig.reasoning`
- [ ] `bun run lint` shows no errors
- [ ] No duplicate imports (check for old `wrapLanguageModel`, `extractReasoningMiddleware`)

## Before/After Comparison

**Before** (58 lines of if-blocks):
- OpenAI if-block (15 lines)
- Anthropic if-block (17 lines)
- Gemini placeholder (10 lines)
- Generic warning (8 lines)
- DeepSeek middleware check (8 lines)

**After** (~30 lines unified):
- Build reasoning options (1 line)
- Get model with API flag (1 line)
- Apply middleware (3 lines)
- Build options object (4 lines)
- Apply provider options (6 lines)
- Apply headers (3 lines)
- Detect reasoning (1 line)

**Reduction**: 89 lines → 30 lines (-66% code)

## Testing

Run the dev server:

```bash
bun run dev
```

Open the app, send a message with a reasoning model (e.g., GPT-5.1 with high thinking effort).

**Check logs for**:
```
[Reasoning] Applied provider options for openai:gpt-5.1: { openai: { reasoningEffort: 'high', reasoningSummary: 'detailed' } }
```

## Rollback

If this phase breaks:

```bash
git checkout convex/generation.ts
```

Or manually restore the if-blocks from git history.

**Safe because**: All other code unchanged, database schema unchanged, UI unchanged.

## Next Steps

After completing this phase:
- **Phase 6**: Test existing models (OpenAI, Anthropic, DeepSeek) still work
- **Phase 7**: Test new providers (Gemini, xAI, Perplexity, Groq)
- **Phase 8**: Cleanup old flags

All phases are independent!

## FAQ

**Q: What if reasoningResult is null?**
A: Graceful - model works without reasoning params (normal behavior).

**Q: Does this break non-reasoning models?**
A: No! If model has no `reasoning` field, `reasoningResult` is null, logic skipped.

**Q: What if handler throws error?**
A: Builder catches it, logs warning, returns null. Generation proceeds without reasoning.

**Q: Can I rollback just generation.ts?**
A: Yes! Phases 1-4 (types, handlers, registry, models) remain usable for future.

**Q: How do I debug reasoning options?**
A: Check console logs - builder logs provider options on apply.

---

**Phase 5 Complete!** ✅ Generation logic unified. 58 lines of if-blocks → 30 lines of clean code.

**This is the critical integration phase** - all previous phases come together here!
