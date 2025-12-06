# Phase 8: Cleanup (Remove Old Flags)

**Estimated Time**: 30 minutes
**Prerequisites**: Phases 6-7 (all tests pass, validation complete)
**Goal**: Remove deprecated `supportsThinkingEffort` flag, migrate to `reasoning` field

## Context

**Problem**: Duplicate sources of truth - both `supportsThinkingEffort` (old) and `reasoning` (new) exist.

**Solution**: Remove old flag, update all UI components to use new `reasoning` field.

**Why Last**: Phases 1-7 maintain backward compatibility. Phase 8 is breaking change - done after validation.

## Architecture Overview

**Current** (after Phases 1-7):
```typescript
// Duplicate - both work
modelConfig.supportsThinkingEffort ← OLD (UI uses this)
modelConfig.reasoning ← NEW (generation.ts uses this)
```

**After Phase 8**:
```typescript
// Single source of truth
modelConfig.reasoning ← ONLY this exists
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
  supportsThinkingEffort?: boolean; // ← REMOVE THIS LINE
  reasoning?: ReasoningConfig;
}
```

**Change to**:
```typescript
export interface ModelConfig {
  id: string;
  provider: string;
  name: string;
  capabilities: ("vision" | "function-calling" | "thinking" | "extended-thinking")[];
  contextWindow: number;
  pricing: { input: number; output: number; reasoning?: number; cached?: number };
  reasoning?: ReasoningConfig; // ← Single source of truth
}
```

**Remove** `supportsThinkingEffort` from all 17 model configs (search for `supportsThinkingEffort:` and delete lines).

**Example** (before):
```typescript
"openai:gpt-5.1": {
  id: "openai:gpt-5.1",
  provider: "openai",
  name: "GPT-5.1",
  capabilities: ["vision", "function-calling", "thinking"],
  contextWindow: 128000,
  pricing: { input: 0.0025, output: 0.01, reasoning: 0.05 },
  supportsThinkingEffort: true, // ← DELETE
  reasoning: {
    type: "openai-reasoning-effort",
    effortMapping: { low: "low", medium: "medium", high: "high" },
    summaryLevel: "detailed",
    useResponsesAPI: true,
  },
}
```

**After**:
```typescript
"openai:gpt-5.1": {
  id: "openai:gpt-5.1",
  provider: "openai",
  name: "GPT-5.1",
  capabilities: ["vision", "function-calling", "thinking"],
  contextWindow: 128000,
  pricing: { input: 0.0025, output: 0.01, reasoning: 0.05 },
  reasoning: {
    type: "openai-reasoning-effort",
    effortMapping: { low: "low", medium: "medium", high: "high" },
    summaryLevel: "detailed",
    useResponsesAPI: true,
  },
}
```

**Validation**: `bun run lint` - should show no errors.

---

### Step 2: Update ChatInput Component

**File**: `src/components/chat/ChatInput.tsx`

**Find** (search for `supportsThinkingEffort`):
```typescript
const supportsThinking = modelConfig?.supportsThinkingEffort;
```

**Replace with**:
```typescript
const supportsThinking = !!modelConfig?.reasoning;
```

**Or find**:
```typescript
{modelConfig?.supportsThinkingEffort && (
  <ThinkingEffortSelector ... />
)}
```

**Replace with**:
```typescript
{modelConfig?.reasoning && (
  <ThinkingEffortSelector ... />
)}
```

**Validation**: Check component compiles, no TypeScript errors.

---

### Step 3: Update ModelSelector Component

**File**: `src/components/chat/ModelSelector.tsx`

**Find** (if exists):
```typescript
const hasReasoning = model.supportsThinkingEffort;
```

**Replace with**:
```typescript
const hasReasoning = !!model.reasoning;
```

**Or find**:
```typescript
{model.supportsThinkingEffort && (
  <Badge variant="secondary">Thinking</Badge>
)}
```

**Replace with**:
```typescript
{model.reasoning && (
  <Badge variant="secondary">Thinking</Badge>
)}
```

**Validation**: Badges still show for reasoning models.

---

### Step 4: Search for Remaining References

**Global search**:
```bash
cd /Users/bhekanik/code/planetaryescape/blah.chat
grep -r "supportsThinkingEffort" src/ convex/
```

**Expected output**: None (all references removed)

**If found**: Update to use `!!modelConfig?.reasoning` instead.

---

### Step 5: Remove Old Comments

**Search for** old reasoning comments in `convex/generation.ts`:

```typescript
// OLD: "Use Responses API for OpenAI reasoning models"
// OLD: "Detect reasoning capability"
// OLD: "OpenAI reasoning effort (GPT-5, o1, o3)"
```

**Delete** old comments - no longer accurate.

**Keep**: New comments from Phase 5:
```typescript
// 8. Build reasoning options (unified for all providers)
// 9. Get model (with Responses API if needed)
// 10. Apply middleware (e.g., DeepSeek tag extraction)
```

---

### Step 6: Update Capabilities Array (Optional)

**Consideration**: Should `capabilities: ["thinking"]` be removed now that `reasoning` field exists?

**Decision**: KEEP capabilities array.

**Reason**:
- `capabilities` = what model CAN do (semantic tags)
- `reasoning` = HOW to enable it (implementation config)
- UI can filter models by capabilities (e.g., "Show all thinking models")
- Backend uses reasoning for API calls

**Example**:
```typescript
{
  capabilities: ["thinking"], // ← KEEP (semantic tag)
  reasoning: { ... } // ← KEEP (implementation)
}
```

**No changes needed** to capabilities.

---

### Step 7: Final Lint & Format

**Run**:
```bash
bun run lint
bun run format
```

**Expected**:
- No TypeScript errors
- No linting warnings
- Clean formatted code

---

## Validation Checklist

- [ ] `supportsThinkingEffort` removed from ModelConfig interface
- [ ] `supportsThinkingEffort` removed from all 17 model configs
- [ ] ChatInput.tsx updated to use `modelConfig?.reasoning`
- [ ] ModelSelector.tsx updated to use `model.reasoning`
- [ ] Global search shows no remaining `supportsThinkingEffort` references
- [ ] Old comments removed from generation.ts
- [ ] `bun run lint` shows no errors
- [ ] `bun run format` succeeds
- [ ] Dev server starts without errors
- [ ] UI shows thinking effort selector for reasoning models
- [ ] Non-reasoning models don't show selector

---

## UI Testing

**After cleanup**:

1. **Start dev server**: `bun run dev`
2. **Open app**, create conversation
3. **Select GPT-5.1** → thinking effort selector shows ✅
4. **Select GPT-4o** → thinking effort selector hidden ✅
5. **Send message with reasoning model** → works ✅
6. **Check no console errors** ✅

---

## Before/After Comparison

### ModelConfig (before Phase 8):
```typescript
{
  id: "openai:gpt-5.1",
  supportsThinkingEffort: true, // ← DUPLICATE
  reasoning: { type: "openai-reasoning-effort", ... }, // ← DUPLICATE
}
```

### ModelConfig (after Phase 8):
```typescript
{
  id: "openai:gpt-5.1",
  reasoning: { type: "openai-reasoning-effort", ... }, // ← SINGLE SOURCE
}
```

### UI Component (before):
```typescript
const show = modelConfig?.supportsThinkingEffort;
```

### UI Component (after):
```typescript
const show = !!modelConfig?.reasoning;
```

**Result**: Single source of truth, cleaner code, no duplication.

---

## Rollback

If Phase 8 breaks UI:

**Revert all changes**:
```bash
git checkout src/lib/ai/models.ts
git checkout src/components/chat/ChatInput.tsx
git checkout src/components/chat/ModelSelector.tsx
```

**Or partial revert** (keep interface, restore model configs):
```typescript
export interface ModelConfig {
  // ... other fields ...
  supportsThinkingEffort?: boolean; // ← RE-ADD
  reasoning?: ReasoningConfig;
}
```

Then re-add `supportsThinkingEffort: true` to 17 models.

**Safe because**: Phases 1-7 infrastructure unchanged. Only config/UI changes in Phase 8.

---

## Migration Guide for Future Models

**Before Phase 8** (during Phases 1-7):
```typescript
{
  id: "newprovider:model-name",
  supportsThinkingEffort: true, // Required for UI
  reasoning: { type: "generic-reasoning-effort", ... }, // Required for generation
}
```

**After Phase 8**:
```typescript
{
  id: "newprovider:model-name",
  reasoning: { type: "generic-reasoning-effort", ... }, // Single field - handles both
}
```

**Adding new model**:
1. Add `reasoning` field (if supports reasoning)
2. UI automatically shows thinking effort selector
3. Generation automatically applies provider options

---

## Success Criteria

**Code Quality**:
- ✅ No duplicate fields (single source of truth)
- ✅ Type-safe (no `any`)
- ✅ Clean (no old comments/dead code)
- ✅ Lints and formats without errors

**Functionality**:
- ✅ UI shows thinking effort for reasoning models
- ✅ UI hides thinking effort for non-reasoning models
- ✅ Generation still works (Phase 5 logic unchanged)
- ✅ No regressions

**Maintainability**:
- ✅ Single place to configure reasoning (models.ts)
- ✅ No confusion about which field to use
- ✅ Clear path for future models

**If all criteria met** → Phase 8 complete ✅

**If UI breaks** → Rollback, investigate, re-attempt

---

## Common Issues & Fixes

**Issue**: TypeScript error "Property 'supportsThinkingEffort' does not exist"

**Cause**: Component not updated in Step 2-3.

**Fix**: Search for all `supportsThinkingEffort` references, replace with `!!model.reasoning`.

---

**Issue**: Thinking effort selector doesn't show for reasoning models

**Cause**: ChatInput check wrong.

**Fix**: Ensure `{modelConfig?.reasoning && ...}` (not `{modelConfig?.supportsThinkingEffort && ...}`).

---

**Issue**: Lint errors after removing field

**Cause**: Unused imports or broken references.

**Fix**: Run `bun run lint --fix` to auto-fix imports.

---

**Issue**: UI shows selector for non-reasoning models

**Cause**: Logic inverted.

**Fix**: Check for `modelConfig?.reasoning` (not `!modelConfig?.reasoning`).

---

## Next Steps

**After Phase 8**:
- ✅ All 8 phases complete
- ✅ Unified reasoning architecture in production
- ✅ Ready to add new models with just config

**Future work**:
- Monitor new provider API docs for reasoning support
- Update `parameterName` fields as APIs stabilize
- Add new reasoning types if providers introduce unique APIs

**Documentation**:
- Update `docs/spec.md` if needed
- Document API parameter research (from Phase 7)
- Add examples of adding new reasoning models

---

## FAQ

**Q: Should I remove `capabilities: ["thinking"]` too?**
A: NO. Keep capabilities - they're semantic tags for filtering. `reasoning` is implementation.

**Q: What if I need to rollback just Phase 8?**
A: Easy - just restore `supportsThinkingEffort` field. Phases 1-7 remain intact.

**Q: Can I do Phase 8 without Phases 6-7?**
A: Technically yes, but risky. Phase 8 removes safety net. Validate first.

**Q: Does Phase 8 affect database?**
A: NO. No schema changes, no data migration. Only code changes.

**Q: What if new UI component is added later?**
A: Use `modelConfig?.reasoning` - single source of truth. No confusion.

---

## Files Modified Summary

**Phase 8 changes**:
1. `src/lib/ai/models.ts` - Remove `supportsThinkingEffort` field + all references
2. `src/components/chat/ChatInput.tsx` - Use `modelConfig?.reasoning`
3. `src/components/chat/ModelSelector.tsx` - Use `model.reasoning`
4. Any other components with reasoning checks

**Total changes**: ~20 lines removed, ~5 lines updated

**Complexity**: LOW (find/replace + interface change)

**Risk**: LOW (easily reversible, no data changes)

---

**Phase 8 Complete!** ✅ Unified reasoning architecture fully implemented. Single source of truth established.

**All 8 Phases Complete!** 🎉 Ready for production.
