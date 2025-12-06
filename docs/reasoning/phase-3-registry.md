# Phase 3: Create Registry + Builder

**Estimated Time**: 30 minutes
**Prerequisites**: Phases 1-2 recommended but not required
**Files to Create**:
- `src/lib/ai/reasoning/registry.ts`
- `src/lib/ai/reasoning/builder.ts`
- `src/lib/ai/reasoning/index.ts`

## Context

**Problem**: No central mapping from model config to handler function.

**Solution**: Registry pattern - map config type → handler, builder orchestrates the flow.

## Architecture Overview

```
types.ts (Phase 1)
handlers/* (Phase 2)
    ↓ imported by registry
registry.ts (THIS PHASE)
    ↓ maps type → handler function
builder.ts (THIS PHASE)
    ↓ calls registry, handles errors
generation.ts (Phase 5)
    ↓ calls builder
```

## Implementation

### Step 1: Create Registry

**File**: `src/lib/ai/reasoning/registry.ts`

```typescript
import type { ReasoningConfig, ReasoningHandler, ThinkingEffort } from "./types";
import { buildOpenAIReasoning } from "./handlers/openai";
import { buildAnthropicReasoning } from "./handlers/anthropic";
import { buildGoogleReasoning } from "./handlers/google";
import { buildDeepSeekReasoning } from "./handlers/deepseek";

// Map config type → handler function
// NO IF-BLOCKS - TypeScript maps type to handler automatically
export const REASONING_HANDLERS: Record<
  ReasoningConfig["type"],
  ReasoningHandler
> = {
  "openai-reasoning-effort": buildOpenAIReasoning,
  "anthropic-extended-thinking": buildAnthropicReasoning,
  "google-thinking-level": buildGoogleReasoning,
  "google-thinking-budget": buildGoogleReasoning, // Same handler for both
  "deepseek-tag-extraction": buildDeepSeekReasoning,
  "generic-reasoning-effort": buildGenericReasoning,
};

// Generic handler for simple providers (xAI, Perplexity, Groq, etc.)
function buildGenericReasoning(
  config: Extract<ReasoningConfig, { type: "generic-reasoning-effort" }>,
  effort: ThinkingEffort,
) {
  return {
    providerOptions: {
      [config.parameterName]: effort, // Dynamic parameter name
    },
  };
}
```

**What it does**:
- Maps each `ReasoningConfig.type` to its handler function
- Includes generic handler for simple providers
- Type-safe - compiler ensures all types handled

### Step 2: Create Builder

**File**: `src/lib/ai/reasoning/builder.ts`

```typescript
import type { ModelConfig } from "../models";
import type { ThinkingEffort } from "./types";
import { REASONING_HANDLERS } from "./registry";

export interface ReasoningResult {
  providerOptions?: any;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
}

export function buildReasoningOptions(
  modelConfig: ModelConfig,
  effortLevel: ThinkingEffort,
): ReasoningResult | null {
  // No reasoning config? Return null (model doesn't support reasoning)
  if (!modelConfig.reasoning) return null;

  // Lookup handler from registry
  const handler = REASONING_HANDLERS[modelConfig.reasoning.type];
  if (!handler) {
    console.warn(
      `[Reasoning] No handler for type: ${modelConfig.reasoning.type}`,
    );
    return null;
  }

  // Call handler with config + effort
  try {
    return handler(modelConfig.reasoning, effortLevel);
  } catch (error) {
    console.error(`[Reasoning] Handler failed:`, error);
    return null;
  }
}
```

**What it does**:
- Single entry point for generation.ts
- Handles missing/invalid configs gracefully
- Try/catch prevents crashes
- Returns null if no reasoning (graceful degradation)

### Step 3: Create Index (Barrel Export)

**File**: `src/lib/ai/reasoning/index.ts`

```typescript
// Re-export public API
export { buildReasoningOptions } from "./builder";
export type { ReasoningResult } from "./builder";
export type { ThinkingEffort, ReasoningConfig } from "./types";
```

**What it does**: Clean imports in other files (`import { buildReasoningOptions } from "@/lib/ai/reasoning"`)

## Validation Checklist

- [ ] `registry.ts` created (~30 lines)
- [ ] Imports all 4 handler functions
- [ ] `REASONING_HANDLERS` maps all 6 config types
- [ ] `buildGenericReasoning` function exists
- [ ] `builder.ts` created (~40 lines)
- [ ] Exports `buildReasoningOptions` function
- [ ] `index.ts` created (~5 lines)
- [ ] `bun run lint` shows no errors
- [ ] All handlers imported correctly (no missing imports)

## Testing Integration (Optional)

**Test the builder**:

```typescript
import { buildReasoningOptions } from "@/lib/ai/reasoning";
import { getModelConfig } from "@/lib/ai/models";

const gpt5Config = getModelConfig("openai:gpt-5.1");
if (gpt5Config) {
  const result = buildReasoningOptions(gpt5Config, "high");
  console.log(result);
  // Expected: { providerOptions: { openai: { ... } }, useResponsesAPI: true }
}
```

## Rollback

If this phase causes issues:

```bash
rm src/lib/ai/reasoning/registry.ts
rm src/lib/ai/reasoning/builder.ts
rm src/lib/ai/reasoning/index.ts
```

Handlers (Phase 2) remain usable.

## Next Steps

After completing this phase:
- **Phase 4**: Add `reasoning` field to model configs (uses these types)
- **Phase 5**: Update generation.ts to call `buildReasoningOptions` (final integration)
- **Phase 6-8**: Testing and cleanup

All phases are independent!

## FAQ

**Q: Why separate registry and builder?**
A: Registry is data (map), builder is logic (orchestration). Separation makes testing easier.

**Q: What if handler throws error?**
A: Builder catches it, logs warning, returns null. Generation proceeds without reasoning (graceful).

**Q: Can I add handlers at runtime?**
A: Currently static. For dynamic handlers, modify registry structure to accept functions.

---

**Phase 3 Complete!** ✅ Registry + builder created. Reasoning system ready for integration.
