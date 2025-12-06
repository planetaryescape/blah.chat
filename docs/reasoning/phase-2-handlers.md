# Phase 2: Create Provider Handlers

**Estimated Time**: 45 minutes
**Prerequisites**: Phase 1 (types.ts) recommended but not required
**Files to Create**: 4 handler files in `src/lib/ai/reasoning/handlers/`

## Context

**Problem**: Provider-specific reasoning logic scattered in generation.ts if-blocks.

**Solution**: Isolated handler functions - one file per provider, type-safe inputs/outputs.

## Architecture Overview

```
types.ts (Phase 1)
    ↓ provides ReasoningConfig types
handlers/* (THIS PHASE)
    ↓ implement builder functions
registry.ts (Phase 3)
    ↓ maps config type → handler
```

## Implementation

### Step 1: Create Handlers Directory

```bash
mkdir -p src/lib/ai/reasoning/handlers
```

### Step 2: Create OpenAI Handler

**File**: `src/lib/ai/reasoning/handlers/openai.ts`

```typescript
import type { ReasoningConfig, ThinkingEffort } from "../types";

export interface ReasoningResult {
  providerOptions?: any;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
}

export function buildOpenAIReasoning(
  config: Extract<ReasoningConfig, { type: "openai-reasoning-effort" }>,
  effort: ThinkingEffort,
): ReasoningResult {
  const mappedEffort = config.effortMapping[effort];

  return {
    providerOptions: {
      openai: {
        reasoningEffort: mappedEffort,
        reasoningSummary: config.summaryLevel || "detailed",
      },
    },
    useResponsesAPI: config.useResponsesAPI,
  };
}
```

**What it does**: Maps user's effort selection ("low", "medium", "high") to OpenAI API parameters, enables Responses API for reasoning summaries.

### Step 3: Create Anthropic Handler

**File**: `src/lib/ai/reasoning/handlers/anthropic.ts`

```typescript
import type { ReasoningConfig, ThinkingEffort } from "../types";

export interface ReasoningResult {
  providerOptions?: any;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
}

export function buildAnthropicReasoning(
  config: Extract<ReasoningConfig, { type: "anthropic-extended-thinking" }>,
  effort: ThinkingEffort,
): ReasoningResult {
  const budgetTokens = config.budgetMapping[effort];

  return {
    providerOptions: {
      anthropic: {
        thinking: {
          type: "enabled",
          budgetTokens,
        },
      },
    },
    headers: {
      "anthropic-beta": config.betaHeader,
    },
  };
}
```

**What it does**: Maps effort to token budgets (low=5k, medium=15k, high=30k), adds beta header for extended thinking API.

### Step 4: Create Google Handler

**File**: `src/lib/ai/reasoning/handlers/google.ts`

```typescript
import type { ReasoningConfig, ThinkingEffort } from "../types";

export interface ReasoningResult {
  providerOptions?: any;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
}

export function buildGoogleReasoning(
  config: ReasoningConfig,
  effort: ThinkingEffort,
): ReasoningResult {
  // Gemini 3 uses thinking levels
  if (config.type === "google-thinking-level") {
    const level = config.levelMapping[effort];
    return {
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: level,
            includeThoughts: config.includeThoughts,
          },
        },
      },
    };
  }

  // Gemini 2.5 uses thinking budgets
  if (config.type === "google-thinking-budget") {
    const budget = config.budgetMapping[effort];
    return {
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: budget,
          },
        },
      },
    };
  }

  return {};
}
```

**What it does**: Handles both Gemini 3 (level-based) and Gemini 2.5 (budget-based) thinking APIs.

### Step 5: Create DeepSeek Handler

**File**: `src/lib/ai/reasoning/handlers/deepseek.ts`

```typescript
import { wrapLanguageModel, extractReasoningMiddleware } from "ai";
import type { ReasoningConfig, ThinkingEffort } from "../types";

export interface ReasoningResult {
  providerOptions?: any;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
}

export function buildDeepSeekReasoning(
  config: Extract<ReasoningConfig, { type: "deepseek-tag-extraction" }>,
  _effort: ThinkingEffort, // Not used for DeepSeek
): ReasoningResult {
  return {
    applyMiddleware: (model) =>
      wrapLanguageModel({
        model,
        middleware: extractReasoningMiddleware({ tagName: config.tagName }),
      }),
  };
}
```

**What it does**: Returns middleware function to extract reasoning from `<think>` tags in DeepSeek output.

## Validation Checklist

- [ ] Directory `src/lib/ai/reasoning/handlers/` exists
- [ ] `openai.ts` created (~20 lines)
- [ ] `anthropic.ts` created (~25 lines)
- [ ] `google.ts` created (~30 lines)
- [ ] `deepseek.ts` created (~15 lines)
- [ ] All files export `ReasoningResult` interface
- [ ] All handlers accept `(config, effort)` parameters
- [ ] `bun run lint` shows no errors

## Testing Handlers (Optional)

**Unit test example** (create `handlers/openai.test.ts`):

```typescript
import { buildOpenAIReasoning } from "./openai";

const config = {
  type: "openai-reasoning-effort" as const,
  effortMapping: { low: "low", medium: "medium", high: "high" },
  summaryLevel: "detailed" as const,
  useResponsesAPI: true,
};

const result = buildOpenAIReasoning(config, "high");

console.log(result);
// Expected: { providerOptions: { openai: { reasoningEffort: "high", reasoningSummary: "detailed" } }, useResponsesAPI: true }
```

Run with:
```bash
bun run handlers/openai.test.ts
```

## Rollback

If this phase causes issues:

```bash
rm -rf src/lib/ai/reasoning/handlers/
```

No other files depend on these yet.

## Next Steps

After completing this phase, you can implement **any** other phase:
- Phase 3 (registry) - imports these handlers
- Phase 4 (models) - defines configs that these handlers process
- Phase 5 (generation.ts) - calls these handlers via builder

All phases are independent!

## FAQ

**Q: Why Extract<> type in handler params?**
A: TypeScript narrows the union to the specific type, giving us autocomplete and type safety for that provider's fields.

**Q: Can I test handlers before integration?**
A: Yes! Each handler is a pure function - pass in config + effort, get provider options out.

**Q: What if a provider needs custom logic?**
A: Add it to the handler! Handlers can return any combination of `providerOptions`, `headers`, `useResponsesAPI`, `applyMiddleware`.

---

**Phase 2 Complete!** ✅ Handler functions created. Move to any other phase next.
