# Phase 4: Update Model Configurations

**Estimated Time**: 1 hour
**Prerequisites**: Phase 1 (types.ts) recommended
**File to Modify**: `src/lib/ai/models.ts`
**Models to Update**: 17 reasoning models across 7 providers

## Context

**Problem**: Model reasoning capabilities scattered - `supportsThinkingEffort` boolean + `capabilities` array.

**Solution**: Declarative `reasoning` field in ModelConfig - single source of truth.

## Architecture Overview

```
models.ts (THIS PHASE)
    ↓ declares reasoning config per model
builder.ts (Phase 3)
    ↓ reads reasoning config
handlers/* (Phase 2)
    ↓ process config
```

## Implementation

### Step 1: Update ModelConfig Interface

**File**: `src/lib/ai/models.ts`

**Find** (around line 10):
```typescript
export interface ModelConfig {
  id: string;
  provider: string;
  name: string;
  capabilities: ("vision" | "function-calling" | "thinking" | "extended-thinking")[];
  contextWindow: number;
  pricing: { input: number; output: number; reasoning?: number; cached?: number };
  supportsThinkingEffort?: boolean; // OLD - will remove in Phase 8
}
```

**Add import at top of file**:
```typescript
import type { ReasoningConfig } from "./reasoning/types";
```

**Update interface** (add reasoning field):
```typescript
export interface ModelConfig {
  id: string;
  provider: string;
  name: string;
  capabilities: ("vision" | "function-calling" | "thinking" | "extended-thinking")[];
  contextWindow: number;
  pricing: { input: number; output: number; reasoning?: number; cached?: number };
  supportsThinkingEffort?: boolean; // Keep for backward compat (Phase 8 removes)

  // NEW: Declarative reasoning config
  reasoning?: ReasoningConfig;
}
```

### Step 2: Update OpenAI Models (3 models)

**Find** `"openai:gpt-5.1"` and **add**:

```typescript
"openai:gpt-5.1": {
  id: "openai:gpt-5.1",
  provider: "openai",
  name: "GPT-5.1",
  // ... existing fields ...
  supportsThinkingEffort: true, // Keep for now

  // ADD THIS:
  reasoning: {
    type: "openai-reasoning-effort",
    effortMapping: {
      low: "low",
      medium: "medium",
      high: "high",
    },
    summaryLevel: "detailed",
    useResponsesAPI: true,
  },
},
```

**Repeat for**:
- `"openai:gpt-5-pro"` (same config)
- `"openai:gpt-5"` (same config)

### Step 3: Update Anthropic Models (2 models)

**Find** `"anthropic:claude-opus-4-5"` and **add**:

```typescript
"anthropic:claude-opus-4-5": {
  id: "anthropic:claude-opus-4-5",
  provider: "anthropic",
  name: "Claude Opus 4.5",
  // ... existing fields ...
  supportsThinkingEffort: true, // Keep for now

  // ADD THIS:
  reasoning: {
    type: "anthropic-extended-thinking",
    budgetMapping: {
      low: 5000,
      medium: 15000,
      high: 30000,
    },
    betaHeader: "interleaved-thinking-2025-05-14",
  },
},
```

**Repeat for**:
- `"anthropic:claude-sonnet-4-5-20250929"` (same config)

### Step 4: Update Google Models (2 models)

**Find** `"google:gemini-3-pro-preview"` and **add**:

```typescript
"google:gemini-3-pro-preview": {
  id: "google:gemini-3-pro-preview",
  provider: "google",
  name: "Gemini 3 Pro",
  // ... existing fields ...
  supportsThinkingEffort: true, // Keep for now

  // ADD THIS:
  reasoning: {
    type: "google-thinking-level",
    levelMapping: {
      low: "low",
      medium: "medium",
      high: "high",
    },
    includeThoughts: true,
  },
},
```

**Find** `"google:gemini-3-deep-think"` and **add**:

```typescript
"google:gemini-3-deep-think": {
  id: "google:gemini-3-deep-think",
  provider: "google",
  name: "Gemini 3 Deep Think",
  // ... existing fields ...

  // ADD THIS:
  reasoning: {
    type: "google-thinking-budget",
    budgetMapping: {
      low: 5000,
      medium: 15000,
      high: 30000,
    },
  },
},
```

### Step 5: Update xAI Models (4 models)

**Template for all xAI models**:

```typescript
reasoning: {
  type: "generic-reasoning-effort",
  parameterName: "reasoningEffort", // Verify with xAI docs
},
```

**Apply to**:
- `"xai:grok-4"`
- `"xai:grok-4.1-fast"`
- `"xai:grok-4-fast"`
- `"xai:grok-code-fast-1"`

### Step 6: Update Perplexity Models (4 models)

**Template for all Perplexity models**:

```typescript
reasoning: {
  type: "generic-reasoning-effort",
  parameterName: "reasoningMode", // Verify with Perplexity docs
},
```

**Apply to**:
- `"perplexity:sonar-pro-search"`
- `"perplexity:sonar-reasoning-pro"`
- `"perplexity:sonar-deep-research"`
- `"perplexity:sonar-reasoning"`

### Step 7: Update OpenRouter DeepSeek (1 model)

**Find** `"openrouter:deepseek-v3"` and **add**:

```typescript
"openrouter:deepseek-v3": {
  id: "openrouter:deepseek-v3",
  provider: "openrouter",
  name: "DeepSeek v3",
  // ... existing fields ...

  // ADD THIS:
  reasoning: {
    type: "deepseek-tag-extraction",
    tagName: "think",
    applyMiddleware: true,
  },
},
```

### Step 8: Update Groq Qwen (1 model)

**Find** `"groq:qwen/qwen3-32b"` and **add**:

```typescript
"groq:qwen/qwen3-32b": {
  id: "groq:qwen/qwen3-32b",
  provider: "groq",
  name: "Qwen3 32B",
  // ... existing fields ...

  // ADD THIS:
  reasoning: {
    type: "generic-reasoning-effort",
    parameterName: "reasoningLevel", // Verify with Groq docs
  },
},
```

## Validation Checklist

- [ ] Import `ReasoningConfig` added at top of file
- [ ] `ModelConfig` interface updated with `reasoning?` field
- [ ] **OpenAI** (3 models): gpt-5.1, gpt-5-pro, gpt-5 ✅
- [ ] **Anthropic** (2 models): claude-opus-4-5, claude-sonnet-4-5 ✅
- [ ] **Google** (2 models): gemini-3-pro-preview, gemini-3-deep-think ✅
- [ ] **xAI** (4 models): grok-4, grok-4.1-fast, grok-4-fast, grok-code-fast-1 ✅
- [ ] **Perplexity** (4 models): sonar-pro-search, sonar-reasoning-pro, sonar-deep-research, sonar-reasoning ✅
- [ ] **OpenRouter** (1 model): deepseek-v3 ✅
- [ ] **Groq** (1 model): qwen3-32b ✅
- [ ] **Total: 17 models configured**
- [ ] `bun run lint` shows no TypeScript errors
- [ ] All reasoning configs have correct `type` field
- [ ] All mappings present (effortMapping, budgetMapping, levelMapping)

## Quick Reference: Provider Patterns

| Provider | Type | Key Fields |
|----------|------|------------|
| OpenAI | `openai-reasoning-effort` | effortMapping, summaryLevel, useResponsesAPI |
| Anthropic | `anthropic-extended-thinking` | budgetMapping, betaHeader |
| Google (Gemini 3) | `google-thinking-level` | levelMapping, includeThoughts |
| Google (Gemini 2.5) | `google-thinking-budget` | budgetMapping |
| DeepSeek | `deepseek-tag-extraction` | tagName, applyMiddleware |
| Generic (xAI/Perplexity/Groq) | `generic-reasoning-effort` | parameterName |

## Testing Model Configs (Optional)

**Verify configs load correctly**:

```typescript
import { getModelConfig } from "@/lib/ai/models";

const gpt5 = getModelConfig("openai:gpt-5.1");
console.log(gpt5?.reasoning);
// Expected: { type: "openai-reasoning-effort", ... }

const claude = getModelConfig("anthropic:claude-opus-4-5");
console.log(claude?.reasoning);
// Expected: { type: "anthropic-extended-thinking", ... }
```

## Rollback

If this phase causes issues:

```bash
git checkout src/lib/ai/models.ts
```

Or manually remove all `reasoning:` fields from model configs.

## Next Steps

After completing this phase:
- **Phase 5**: Update generation.ts to use these configs (final integration)
- **Phase 6-7**: Test that models work correctly
- **Phase 8**: Remove old `supportsThinkingEffort` field

All phases are independent!

## FAQ

**Q: Do I need to update ALL 17 models at once?**
A: No! Update incrementally - test each provider before moving to next.

**Q: What if I don't know the correct parameterName for generic providers?**
A: Start with best guess ("reasoningEffort"), test in Phase 7, adjust if needed.

**Q: Can I leave models without reasoning config?**
A: Yes! Models without `reasoning` field work normally (no reasoning sent to API).

**Q: What if API rejects unknown parameter?**
A: APIs typically ignore unknown params - worst case: remove `reasoning` field for that model.

---

**Phase 4 Complete!** ✅ All 17 model configs updated with declarative reasoning.
