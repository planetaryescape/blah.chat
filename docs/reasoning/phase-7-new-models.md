# Phase 7: Test New Providers (Gemini, xAI, Perplexity, Groq)

**Estimated Time**: 1 hour
**Prerequisites**: Phase 6 (regression tests pass)
**Goal**: Validate newly enabled reasoning providers work correctly

## Context

**Purpose**: Test 11 models newly enabled by unified architecture.

**New Providers**:
- ✅ Google Gemini (2 models)
- ✅ xAI Grok (4 models)
- ✅ Perplexity Sonar (4 models)
- ✅ Groq Qwen (1 model)

**Difference from Phase 6**: Phase 6 tested EXISTING working models (OpenAI, Anthropic, DeepSeek). Phase 7 tests NEWLY enabled models.

## Test Plan

### Test 1: Google Gemini 3 Pro (Thinking Level)

**Steps**:
1. Start dev server: `bun run dev`
2. Open app, create new conversation
3. Select model: **Gemini 3 Pro Preview**
4. Select thinking effort: **High**
5. Send message: "Design a RESTful API for a task management system"
6. Wait for response

**Expected Behavior**:
- ✅ "Thinking..." spinner appears
- ✅ Reasoning block shows with duration + tokens
- ✅ Reasoning text visible (if API returns it)
- ✅ Message content appears below reasoning
- ✅ No errors in console

**Check Logs**:
```
[Reasoning] Applied provider options for google:gemini-3-pro-preview: { google: { thinkingConfig: { thinkingLevel: 'high', includeThoughts: true } } }
```

**Database Check** (optional):
- Find message in Convex dashboard
- Verify: `reasoning`, `reasoningTokens`, `thinkingStartedAt`, `thinkingCompletedAt`

**Troubleshooting**:
- If no reasoning appears: Check Google API docs for correct parameter name
- If API error: Gemini 3 might require beta access or different parameter
- **Fallback**: Remove `reasoning` field from model config → model uses default behavior

---

### Test 2: Google Gemini 3 Deep Think (Thinking Budget)

**Steps**:
1. Create new conversation
2. Select model: **Gemini 3 Deep Think**
3. Select thinking effort: **High** (30k token budget)
4. Send message: "Explain how blockchain consensus algorithms work"
5. Wait for response

**Expected Behavior**:
- ✅ "Thinking..." spinner appears
- ✅ Reasoning block shows
- ✅ Budget tokens sent to API
- ✅ Message content appears
- ✅ No errors

**Check Logs**:
```
[Reasoning] Applied provider options for google:gemini-3-deep-think: { google: { thinkingConfig: { thinkingBudget: 30000 } } }
```

**Troubleshooting**:
- If API rejects parameter: Check Gemini 2.5 API docs (might use different field)
- **Fallback**: Remove `reasoning` field → graceful degradation

---

### Test 3: xAI Grok (Generic Reasoning Effort)

**Steps**:
1. Create new conversation
2. Select model: **Grok 4** (or any xAI model)
3. Select thinking effort: **High**
4. Send message: "Write a sorting algorithm in Rust"
5. Wait for response

**Expected Behavior**:
- ✅ "Thinking..." spinner appears (if xAI supports it)
- ✅ Reasoning block shows (if xAI outputs reasoning metadata)
- ✅ Message content appears
- ✅ **Critical**: No API errors

**Check Logs**:
```
[Reasoning] Applied provider options for xai:grok-4: { reasoningEffort: 'high' }
```

**Troubleshooting**:
- **If API error**: Parameter name might be wrong
  - Check xAI API docs for correct parameter (`reasoningEffort`, `thinkingLevel`, `thinkingMode`?)
  - Update `parameterName` in phase-4-models.md config
- **If API ignores parameter**: xAI might not support reasoning params yet
  - Remove `reasoning` field from model config
  - Model still works, just without reasoning display
- **No reasoning output**: xAI might not return reasoning in response
  - Expected behavior! Some providers don't expose reasoning even if they support it internally
  - Model works fine, just no reasoning block shown

**Expected Outcome**: Model works with or without reasoning display. No crashes.

---

### Test 4: Perplexity Sonar (Generic Reasoning Effort)

**Steps**:
1. Create new conversation
2. Select model: **Sonar Reasoning Pro** (or any Perplexity model)
3. Select thinking effort: **High**
4. Send message: "Summarize recent developments in quantum computing"
5. Wait for response

**Expected Behavior**:
- ✅ "Thinking..." spinner appears (if Perplexity supports it)
- ✅ Reasoning block shows (if Perplexity outputs reasoning)
- ✅ Message content appears
- ✅ **Critical**: No API errors

**Check Logs**:
```
[Reasoning] Applied provider options for perplexity:sonar-reasoning-pro: { reasoningMode: 'high' }
```

**Troubleshooting**:
- **If API error**: Parameter name might be wrong
  - Check Perplexity API docs
  - Common names: `reasoningMode`, `thinkingLevel`, `searchDepth`
  - Update `parameterName` in model config
- **If API ignores**: Perplexity might not support reasoning params
  - Remove `reasoning` field
  - Model works normally

**Expected Outcome**: Model works. Reasoning display optional.

---

### Test 5: Groq Qwen (Generic Reasoning Effort)

**Steps**:
1. Create new conversation
2. Select model: **Qwen3 32B**
3. Select thinking effort: **High**
4. Send message: "Explain how transformers work in machine learning"
5. Wait for response

**Expected Behavior**:
- ✅ Message appears
- ✅ **Critical**: No API errors
- ✅ Reasoning display (optional)

**Check Logs**:
```
[Reasoning] Applied provider options for groq:qwen/qwen3-32b: { reasoningLevel: 'high' }
```

**Troubleshooting**:
- **If API error**: Check Groq API docs for correct parameter
- **If no reasoning**: Expected - Groq might not expose reasoning
- **Fallback**: Remove `reasoning` field

---

### Test 6: Generic Provider Without Reasoning Config (Control)

**Steps**:
1. Create new conversation
2. Select model with NO `reasoning` field (e.g., GPT-4o)
3. Send message: "Hello"
4. Wait for response

**Expected Behavior**:
- ✅ Works normally
- ✅ No thinking effort selector shown (or shown but ignored)
- ✅ No reasoning block
- ✅ No errors

**Check Logs**:
```
(No [Reasoning] logs - reasoningResult is null)
```

**Purpose**: Verify graceful degradation - models without `reasoning` config still work.

---

## Validation Checklist

**Google Gemini** (2 models):
- [ ] Gemini 3 Pro tested (thinking level)
- [ ] Gemini 3 Deep Think tested (thinking budget)
- [ ] Logs show `thinkingConfig` parameter sent
- [ ] Either reasoning displays OR model works without errors
- [ ] Fallback to removing `reasoning` field works if API rejects params

**xAI Grok** (4 models):
- [ ] At least 1 xAI model tested
- [ ] Logs show `reasoningEffort` parameter sent
- [ ] Model works (reasoning display optional)
- [ ] No API errors OR parameter updated/removed

**Perplexity** (4 models):
- [ ] At least 1 Perplexity model tested
- [ ] Logs show `reasoningMode` parameter sent
- [ ] Model works (reasoning display optional)
- [ ] No API errors OR parameter updated/removed

**Groq** (1 model):
- [ ] Qwen3 32B tested
- [ ] Logs show `reasoningLevel` parameter sent
- [ ] Model works (reasoning display optional)
- [ ] No API errors OR parameter updated/removed

**Generic Providers**:
- [ ] Models work with or without reasoning display
- [ ] API errors investigated and resolved (parameter name or removal)
- [ ] Graceful degradation verified

---

## Common Issues & Fixes

### Issue: API Error - "Unknown parameter: reasoningEffort"

**Cause**: Provider doesn't support parameter OR parameter name wrong.

**Fix 1** (Wrong parameter name):
1. Check provider's API docs
2. Update `parameterName` in model config (phase-4-models.md)
3. Example: Change `"reasoningEffort"` → `"thinkingLevel"`
4. Re-test

**Fix 2** (Provider doesn't support):
1. Remove `reasoning` field from model config
2. Model works normally without reasoning params
3. No reasoning display (expected)

### Issue: No reasoning block appears despite parameter sent

**Cause**: Provider doesn't return reasoning in API response.

**Expected Behavior**: This is NORMAL for many providers.
- Some providers use reasoning internally but don't expose it
- Model still works correctly
- No reasoning block shown (by design)

**Action**: No fix needed - working as intended.

### Issue: API rejects request entirely

**Cause**: Parameter breaks API contract.

**Fix**:
1. Remove `reasoning` field from model config immediately
2. Test model works without reasoning params
3. Investigate API docs for correct parameter
4. Re-add `reasoning` field once correct parameter found

### Issue: xAI/Perplexity/Groq not installed in project

**Cause**: These providers might not be configured in `src/lib/ai/providers/`.

**Fix**:
1. Check `src/lib/ai/providers/` for provider files
2. If missing: Add provider configuration
3. If present but model not in registry: Add to `src/lib/ai/models.ts`

---

## Success Criteria

**Minimum Requirements** (Must Pass):
- ✅ All tested models work (send message, get response)
- ✅ No API errors that break generation
- ✅ Non-reasoning models unaffected
- ✅ App doesn't crash

**Optimal Results** (Best Case):
- ✅ Reasoning blocks appear for supported providers
- ✅ Logs show correct parameters sent
- ✅ Token counts accurate
- ✅ Database fields populated

**Acceptable Fallback** (Still Success):
- ✅ Models work without reasoning display
- ✅ Unknown parameters gracefully ignored by APIs
- ✅ `reasoning` field removed for incompatible providers
- ✅ No regressions in other functionality

**If minimum requirements met** → Phase 7 complete ✅

**If API errors persist** → Remove `reasoning` field, document in phase notes

---

## API Parameter Research Notes

Use this section to document findings from testing:

**Google Gemini**:
- API Docs: [URL if found]
- Correct parameter: `thinkingConfig.thinkingLevel` / `thinkingConfig.thinkingBudget`
- Works: ✅ / ❌
- Notes:

**xAI Grok**:
- API Docs: [URL if found]
- Correct parameter: `reasoningEffort` / other?
- Works: ✅ / ❌
- Notes:

**Perplexity**:
- API Docs: [URL if found]
- Correct parameter: `reasoningMode` / other?
- Works: ✅ / ❌
- Notes:

**Groq**:
- API Docs: [URL if found]
- Correct parameter: `reasoningLevel` / other?
- Works: ✅ / ❌
- Notes:

---

## Rollback

If Phase 7 causes critical issues:

**Option 1** (Rollback all new providers):
```bash
# Revert model configs (phase 4)
git checkout src/lib/ai/models.ts
```

**Option 2** (Remove specific provider):
```typescript
// In src/lib/ai/models.ts
"xai:grok-4": {
  // ... existing fields ...
  // reasoning: { ... } // ← Comment out or remove
}
```

**Option 3** (Keep infrastructure, remove configs):
- Phases 1-5 (types, handlers, registry, builder, generation) remain
- Only remove `reasoning` fields from problematic models
- Can re-add later with correct parameters

**Safe because**: OpenAI, Anthropic, DeepSeek still work (Phase 6 validated).

---

## Next Steps

**After Phase 7**:
- Update API parameter research notes with findings
- Document which providers support reasoning display
- Proceed to Phase 8 (cleanup old flags)

**If providers don't support reasoning**:
- Document in notes
- Remove `reasoning` field
- Move forward - not a blocker

**If APIs need investigation**:
- Create follow-up task to research API docs
- Leave `reasoning` field commented out
- Re-enable after confirmation

---

## FAQ

**Q: What if NONE of the new providers support reasoning parameters?**
A: SUCCESS! Infrastructure works, models work, just no reasoning display. Remove `reasoning` fields, document findings. Architecture still valuable for future providers.

**Q: Should I test all 11 models?**
A: Minimum: 1 model per provider (4 tests). Optimal: 2-3 models per provider. If one xAI model works, others likely work too.

**Q: What if I don't have API keys for xAI/Perplexity/Groq?**
A: Skip those tests. Focus on Gemini (likely have Google API key). Document "Not tested - no API key" in notes.

**Q: API error but model ID is wrong?**
A: Check `src/lib/ai/models.ts` for correct model IDs. Phase 4 might have placeholders.

**Q: Reasoning appears but looks wrong?**
A: Check `ReasoningBlock.tsx` display logic. Might need provider-specific formatting.

---

**Phase 7 Complete!** ✅ New providers validated. Safe to proceed to Phase 8 (cleanup).

**Expected Outcome**: Some providers show reasoning, some don't - both acceptable.
