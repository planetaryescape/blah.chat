# Phase 1: Create Type Definitions

**Estimated Time**: 15 minutes
**Prerequisites**: None (self-contained)
**File to Create**: `src/lib/ai/reasoning/types.ts`

## Context

**Problem**: Provider-specific reasoning config scattered across if-blocks with no type safety.

**Solution**: Discriminated union types - one type per provider, type-safe at compile time.

## Architecture Overview

```
types.ts (THIS PHASE)
    ↓ defines ReasoningConfig union
registry.ts
    ↓ maps config type → handler
builder.ts
    ↓ constructs provider options
```

## Implementation

### Step 1: Create Directory Structure

```bash
mkdir -p src/lib/ai/reasoning
```

### Step 2: Create `src/lib/ai/reasoning/types.ts`

**Full file content** (copy-paste ready):

```typescript
// Thinking effort levels
export type ThinkingEffort = "low" | "medium" | "high";

// Discriminated union - one type per provider
// TypeScript enforces which fields are valid for each type
export type ReasoningConfig =
  | {
      // OpenAI GPT-5 models (gpt-5.1, gpt-5-pro, gpt-5)
      type: "openai-reasoning-effort";
      effortMapping: Record<ThinkingEffort, string>;
      summaryLevel?: "brief" | "detailed";
      useResponsesAPI: boolean;
    }
  | {
      // Anthropic Claude models with extended thinking
      type: "anthropic-extended-thinking";
      budgetMapping: Record<ThinkingEffort, number>; // Token budgets
      betaHeader: string; // e.g., "interleaved-thinking-2025-05-14"
    }
  | {
      // Google Gemini 3 models (thinking level)
      type: "google-thinking-level";
      levelMapping: Record<ThinkingEffort, "low" | "medium" | "high">;
      includeThoughts: boolean;
    }
  | {
      // Google Gemini 2.5 models (thinking budget)
      type: "google-thinking-budget";
      budgetMapping: Record<ThinkingEffort, number>;
    }
  | {
      // DeepSeek models (tag extraction)
      type: "deepseek-tag-extraction";
      tagName: string; // e.g., "think"
      applyMiddleware: true; // Flag to apply wrapLanguageModel
    }
  | {
      // Generic provider (xAI, Perplexity, Groq, etc.)
      // Handles simple reasoning-effort parameters
      type: "generic-reasoning-effort";
      parameterName: string; // e.g., "reasoningEffort", "thinkingLevel"
    };

// Provider options output (type-safe)
// Used by handlers to construct API request options
export type ProviderOptions = {
  openai?: {
    reasoningEffort?: string;
    reasoningSummary?: "brief" | "detailed";
  };
  anthropic?: {
    thinking?: {
      type: "enabled";
      budgetTokens: number;
    };
  };
  google?: {
    thinkingConfig?: {
      thinkingLevel?: "low" | "medium" | "high";
      thinkingBudget?: number;
      includeThoughts?: boolean;
    };
  };
  xai?: {
    reasoningEffort?: string;
  };
  perplexity?: {
    reasoningMode?: string;
  };
  groq?: {
    reasoningLevel?: string;
  };
};

// Handler function signature
// Takes config + effort level, returns provider options + metadata
export type ReasoningHandler = (
  config: ReasoningConfig,
  effort: ThinkingEffort,
) => {
  providerOptions?: ProviderOptions;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
};
```

### Step 3: Validate Types

Run lint to ensure no TypeScript errors:

```bash
bun run lint
```

**Expected output**: No errors related to `types.ts`

## Validation Checklist

- [ ] Directory `src/lib/ai/reasoning/` exists
- [ ] File `src/lib/ai/reasoning/types.ts` created
- [ ] File has 80+ lines
- [ ] Exports `ThinkingEffort`, `ReasoningConfig`, `ProviderOptions`, `ReasoningHandler`
- [ ] `bun run lint` shows no errors
- [ ] TypeScript recognizes discriminated union (IntelliSense shows type narrowing)

## What This Enables

**Type safety example**:

```typescript
// Correct - TypeScript happy
const openaiConfig: ReasoningConfig = {
  type: "openai-reasoning-effort",
  effortMapping: { low: "low", medium: "medium", high: "high" },
  useResponsesAPI: true,
};

// Error - TypeScript catches missing required field
const badConfig: ReasoningConfig = {
  type: "openai-reasoning-effort",
  // Missing effortMapping and useResponsesAPI
};

// Error - TypeScript catches wrong field for type
const wrongConfig: ReasoningConfig = {
  type: "openai-reasoning-effort",
  budgetMapping: { low: 5000 }, // budgetMapping is for anthropic only!
  useResponsesAPI: true,
};
```

## Rollback

If this phase causes issues:

```bash
rm src/lib/ai/reasoning/types.ts
# If needed:
rmdir src/lib/ai/reasoning
```

No other files depend on this yet.

## Next Steps

After completing this phase, you can implement **any** other phase:
- Phase 2 (handlers) - uses these types
- Phase 3 (registry/builder) - uses these types
- Phase 4 (models) - adds these types to model configs

All phases are independent!

## FAQ

**Q: Why discriminated unions instead of interfaces?**
A: TypeScript can narrow types based on the `type` field, catching errors at compile time.

**Q: What if I need to add a new provider?**
A: Add a new type to the `ReasoningConfig` union (e.g., `| { type: "mistral-reasoning", ... }`).

**Q: Why separate `google-thinking-level` and `google-thinking-budget`?**
A: Different Gemini versions use different APIs - level for Gemini 3, budget for Gemini 2.5.

---

**Phase 1 Complete!** ✅ Type definitions created. Move to any other phase next.
