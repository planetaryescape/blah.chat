# Phase 6: Regression Testing (Existing Models)

**Estimated Time**: 30 minutes
**Prerequisites**: Phase 5 (generation.ts updated)
**Goal**: Verify OpenAI, Anthropic, DeepSeek reasoning still works after refactor

## Context

**Purpose**: Ensure unified architecture doesn't break existing working models.

**Models to Test**:
- ✅ OpenAI (GPT-5.1, GPT-5-pro, GPT-5)
- ✅ Anthropic (Claude Opus 4.5, Claude Sonnet 4.5)
- ✅ DeepSeek (via OpenRouter or direct)

## Test Plan

### Test 1: OpenAI GPT-5.1 Reasoning

**Steps**:
1. Start dev server: `bun run dev`
2. Open app, create new conversation
3. Select model: GPT-5.1
4. Select thinking effort: **High**
5. Send message: "Explain quantum entanglement in simple terms"
6. Wait for response

**Expected Behavior**:
- ✅ "Thinking..." spinner appears
- ✅ Reasoning block shows (collapsed) with "Thought for Xs (N tokens)"
- ✅ Click reasoning block → expands with reasoning summary or token count
- ✅ Message content appears below reasoning
- ✅ No errors in console

**Check Logs**:
```
[Reasoning] Applied provider options for openai:gpt-5.1: { openai: { reasoningEffort: 'high', reasoningSummary: 'detailed' } }
[Reasoning] Model: openai:gpt-5.1, Outputs: [...]
```

**Database Check** (optional):
- Open Convex dashboard
- Find the message
- Verify fields: `reasoning`, `reasoningTokens`, `thinkingStartedAt`, `thinkingCompletedAt`

---

### Test 2: Anthropic Claude Opus Extended Thinking

**Steps**:
1. Create new conversation
2. Select model: Claude Opus 4.5
3. Select thinking effort: **High** (30k token budget)
4. Send message: "Design a database schema for a social network"
5. Wait for response

**Expected Behavior**:
- ✅ "Thinking..." spinner appears
- ✅ Reasoning block shows with duration + tokens
- ✅ Reasoning text visible (Anthropic returns full reasoning)
- ✅ Message content below
- ✅ No errors

**Check Logs**:
```
[Reasoning] Applied provider options for anthropic:claude-opus-4-5: { anthropic: { thinking: { type: 'enabled', budgetTokens: 30000 } } }
anthropic-beta: interleaved-thinking-2025-05-14
```

---

### Test 3: DeepSeek Tag Extraction

**Steps**:
1. Create new conversation
2. Select model: DeepSeek v3 (OpenRouter)
3. Send message: "Write a Python function to sort a list"
4. Wait for response

**Expected Behavior**:
- ✅ Middleware applied (check logs: "extractReasoningMiddleware")
- ✅ Reasoning block appears if DeepSeek outputs `<think>` tags
- ✅ Reasoning extracted from tags
- ✅ Message content clean (no `<think>` tags visible)
- ✅ No errors

**Check Logs**:
```
[Reasoning] Applied middleware for openrouter:deepseek-v3
```

---

### Test 4: Non-Reasoning Model (Control Test)

**Steps**:
1. Create new conversation
2. Select model: GPT-4o or Claude Haiku (non-reasoning)
3. Send message: "Hello, how are you?"
4. Wait for response

**Expected Behavior**:
- ✅ No "Thinking..." spinner
- ✅ No reasoning block
- ✅ Message appears normally
- ✅ No errors in console
- ✅ **Critical**: App works normally for non-reasoning models

**Check Logs**:
```
(No reasoning logs - reasoningResult is null)
```

---

## Validation Checklist

**OpenAI Models**:
- [ ] GPT-5.1 + high effort → reasoning summary shows
- [ ] Reasoning tokens counted
- [ ] Responses API used (check logs)
- [ ] No errors

**Anthropic Models**:
- [ ] Claude Opus + high effort → full reasoning text shows
- [ ] Budget tokens correct (30k for high)
- [ ] Beta header sent
- [ ] No errors

**DeepSeek Models**:
- [ ] Middleware applied
- [ ] `<think>` tags extracted
- [ ] Reasoning appears in UI
- [ ] No errors

**Non-Reasoning Models**:
- [ ] Work normally (no reasoning UI)
- [ ] No console errors
- [ ] No degradation

**Database** (optional):
- [ ] Check 1 OpenAI message → has `reasoning`, `reasoningTokens`
- [ ] Check 1 Anthropic message → has `reasoning`, `reasoningTokens`
- [ ] Check 1 non-reasoning message → no reasoning fields

## Common Issues & Fixes

**Issue**: No reasoning block appears for GPT-5.1
- **Check**: Model config has `reasoning` field (Phase 4)
- **Check**: Logs show "[Reasoning] Applied provider options"
- **Fix**: Verify `buildReasoningOptions` returns non-null

**Issue**: Anthropic reasoning empty
- **Check**: Headers include `anthropic-beta`
- **Check**: Budget tokens sent
- **Fix**: Verify handler returns correct structure

**Issue**: DeepSeek reasoning not extracted
- **Check**: Middleware applied (logs)
- **Check**: DeepSeek outputs `<think>` tags (check raw response)
- **Fix**: Verify `applyMiddleware` function called

**Issue**: Non-reasoning models broken
- **Critical**: This indicates regression!
- **Fix**: Verify `reasoningResult` null check works
- **Rollback**: `git revert` Phase 5 commit

## Success Criteria

✅ All 3 reasoning model types work (OpenAI, Anthropic, DeepSeek)
✅ Non-reasoning models unaffected
✅ No console errors
✅ Database fields populated correctly
✅ UI displays reasoning blocks correctly

**If all tests pass** → proceed to Phase 7 (test new providers)

**If any test fails** → debug or rollback Phase 5

## Rollback

If regression detected:

```bash
git revert <phase-5-commit>
# Or manually restore generation.ts if-blocks
```

No data loss - database schema unchanged.

---

**Phase 6 Complete!** ✅ Existing models validated. Safe to proceed to Phase 7.
