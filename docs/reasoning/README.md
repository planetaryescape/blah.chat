# Unified Reasoning Architecture

**Status**: Implementation Guide
**Last Updated**: 2025-12-06
**Complexity**: Medium (production-grade refactor)
**Estimated Time**: ~5 hours

## Overview

This directory contains self-contained implementation guides for migrating from provider-specific if-blocks to a unified reasoning registry system.

**Current Problem**: 58 lines of if-blocks in `convex/generation.ts` for handling 17 reasoning models across 7 providers.

**Solution**: Factory Pattern with discriminated unions - declarative config in `models.ts`, executed via type-safe handlers.

##Architecture

```
Model Config (models.ts)
    ↓ declares reasoning capability
Handler Registry (registry.ts)
    ↓ maps config type → builder function
Request Builder (builder.ts)
    ↓ constructs type-safe provider options
Generation Logic (generation.ts)
    ↓ executes (zero if-blocks)
```

## Benefits

- **Add new model**: 1 config entry (no code changes)
- **Type-safe**: Discriminated unions (no `any`)
- **Maintainable**: Provider logic isolated in handlers
- **Extensible**: Generic handler for simple providers

## Provider Coverage

| Provider | Models | Handler Type |
|----------|--------|--------------|
| OpenAI | 3 (gpt-5.1, gpt-5-pro, gpt-5) | `openai-reasoning-effort` |
| Anthropic | 2 (claude-opus/sonnet-4-5) | `anthropic-extended-thinking` |
| Google | 2 (gemini-3-pro, gemini-3-deep-think) | `google-thinking-*` |
| xAI | 4 (grok-4*, grok-code-fast-1) | `generic-reasoning-effort` |
| Perplexity | 4 (sonar-*) | `generic-reasoning-effort` |
| OpenRouter | 1 (deepseek-v3) | `deepseek-tag-extraction` |
| Groq | 1 (qwen3-32b) | `generic-reasoning-effort` |

**Total**: 17 models, 7 providers, 5 handler types ✅

## Implementation Phases

Each phase file is **self-contained** - implement in any order:

1. **[phase-1-types.md](./phase-1-types.md)** - Create type definitions
   ~15 min | Creates `src/lib/ai/reasoning/types.ts`

2. **[phase-2-handlers.md](./phase-2-handlers.md)** - Create provider handlers
   ~45 min | Creates 4 handler files (OpenAI, Anthropic, Google, DeepSeek)

3. **[phase-3-registry.md](./phase-3-registry.md)** - Create registry + builder
   ~30 min | Creates `registry.ts` + `builder.ts`

4. **[phase-4-models.md](./phase-4-models.md)** - Update 17 model configs
   ~1 hour | Adds `reasoning` field to `models.ts`

5. **[phase-5-generation.md](./phase-5-generation.md)** - Update generation logic
   ~30 min | Replaces 58 lines of if-blocks with ~10 lines

6. **[phase-6-regression.md](./phase-6-regression.md)** - Test existing models
   ~30 min | Validates OpenAI, Anthropic, DeepSeek still work

7. **[phase-7-new-models.md](./phase-7-new-models.md)** - Test new providers
   ~30 min | Validates Gemini, xAI, Perplexity, Groq

8. **[phase-8-cleanup.md](./phase-8-cleanup.md)** - Remove old flags
   ~30 min | Removes `supportsThinkingEffort`, updates UI

## Quick Start

```bash
# 1. Pick any phase file (they're independent)
cd docs/reasoning

# 2. Follow the phase guide step-by-step
# Each file has complete context + copy-paste code

# 3. Validate using the checklist in the phase file

# 4. Move to next phase (any order)
```

## What's in Each Phase File?

Every phase file includes:
- ✅ Full context (problem + architecture overview)
- ✅ Exact code to write (copy-paste ready)
- ✅ File paths + line numbers
- ✅ Validation checklist
- ✅ Rollback instructions
- ✅ **No dependencies** on other phases

## Code Changes Summary

**Created** (7 new files):
- `src/lib/ai/reasoning/types.ts` (~80 lines)
- `src/lib/ai/reasoning/registry.ts` (~30 lines)
- `src/lib/ai/reasoning/builder.ts` (~40 lines)
- `src/lib/ai/reasoning/handlers/openai.ts` (~20 lines)
- `src/lib/ai/reasoning/handlers/anthropic.ts` (~25 lines)
- `src/lib/ai/reasoning/handlers/google.ts` (~30 lines)
- `src/lib/ai/reasoning/handlers/deepseek.ts` (~15 lines)

**Modified** (2 files):
- `src/lib/ai/models.ts` - Add `reasoning` field, update 17 models
- `convex/generation.ts` - Replace lines 289-346 with ~10 lines

**Total**: ~240 lines added, ~58 lines removed = net +182 lines
**Result**: Simpler, type-safe, extensible

## Success Criteria

**Technical**:
- ✅ Zero if-blocks in generation.ts
- ✅ Type-safe (no `any`)
- ✅ Single source of truth (models.ts)

**Functional**:
- ✅ All 17 reasoning models work
- ✅ Reasoning UI displays correctly
- ✅ Token counts accurate

**Maintainability**:
- ✅ Adding model = 1 config entry
- ✅ No dead code
- ✅ No duplicate implementations

## Rollback Strategy

**Per-phase rollback** (if something breaks):
1. Revert commits from that phase
2. Delete created files (if any)
3. Back to working state in <2 minutes

**Full rollback** (nuclear option):
1. `git revert <phase-5-commit>` (generation.ts changes)
2. `rm -rf src/lib/ai/reasoning/`
3. Keep `reasoning` field in models.ts (optional, doesn't break anything)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Type errors | Low | Strict TypeScript catches at compile |
| Handler crashes | Low | Try/catch in builder |
| Regression | Medium | Phase 6 validation before cleanup |
| Missing logic | Low | Registry enforces completeness |

**Overall**: LOW - Incremental phases with validation checkpoints.

## Support

**Questions?** Check the individual phase files - they include detailed explanations and examples.

**Issues?** Use the rollback instructions in each phase file to revert changes.

##Future Additions

**Adding a new reasoning provider**:

```typescript
// In models.ts - just config, no code changes
{
  id: "newprovider:model-name",
  reasoning: {
    type: "generic-reasoning-effort", // 95% of cases
    parameterName: "reasoningLevel", // whatever API uses
  },
}
```

**Complex provider** (5% of cases):
1. Add new discriminated union type to `types.ts`
2. Create handler in `handlers/<provider>.ts`
3. Register in `registry.ts`
4. Add config to model in `models.ts`

That's it - generation.ts never changes.

---

Ready to begin? Pick any phase file and start implementing!
