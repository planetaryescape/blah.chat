# Resilient Generation Manual Testing - Phase 6

**Date:** 2025-12-16
**Purpose:** Validate that resilient generation (blah.chat's core feature) survives page refresh mid-generation

## Prerequisites

- [ ] Local dev server running (`bun dev`)
- [ ] User logged in (test or personal account)
- [ ] Open browser DevTools (for network testing)

---

## Test 1: Refresh Mid-Generation ✅❌

**Objective:** Verify partialContent persists through page refresh

**Steps:**
1. Navigate to chat conversation
2. Send message: `"Write a detailed 500-word essay about React hooks and their benefits"`
3. Wait **2-3 seconds** (observe streaming partialContent)
4. **Refresh page** (Cmd+R / Ctrl+R / F5)
5. Observe: Message still showing partialContent
6. Wait for completion (30-60 seconds)

**Expected Results:**
- ✅ Partial content visible immediately after refresh
- ✅ "Generating..." indicator shows active generation
- ✅ Streaming resumes from last checkpoint
- ✅ Final content is complete essay (500+ words)
- ✅ No duplicate messages
- ✅ No content flickering or jumping

**Test Data Attributes:**
- Message: `[data-testid="message"][data-status="generating"]`
- Content: `[data-testid="message-content"]`
- Indicator: `[data-testid="message-generating"]`

**Actual Result:** _[Fill in during testing]_

**Status:** _[PASS / FAIL / SKIP]_

**Notes:** _[Any observations, issues, or comments]_

---

## Test 2: Close Tab Mid-Generation ✅❌

**Objective:** Verify server continues generation when client disconnects

**Steps:**
1. Send same message: `"Write a detailed 500-word essay about TypeScript features"`
2. Wait **2-3 seconds** (see partial content)
3. **Close browser tab** (Cmd+W / Ctrl+W)
4. Wait **10 seconds**
5. Open new tab, navigate to same conversation URL
6. Observe message status

**Expected Results:**
- ✅ Message visible (status: `complete` OR `generating`)
- ✅ If `generating`: see partial content from before close
- ✅ If `complete`: see full essay
- ✅ Content is coherent (no corruption)
- ✅ Status transitions to `complete` if still generating

**Test Data Attributes:**
- Message: `[data-testid="message"]`
- Status attr: `[data-status="complete"]` or `[data-status="generating"]`
- Complete indicator: `[data-testid="message-complete"]`

**Actual Result:** _[Fill in]_

**Status:** _[PASS / FAIL / SKIP]_

**Notes:** _[Any observations]_

---

## Test 3: Network Disconnect Mid-Generation ✅❌

**Objective:** Verify Convex reconnect continues streaming

**Steps:**
1. Open DevTools Network tab
2. Send message: `"Explain quantum computing in 300 words"`
3. Wait **2 seconds** (see partial content)
4. **Toggle offline** (DevTools → Network → Offline checkbox)
5. Wait **3 seconds** (observe frozen content)
6. **Toggle online** (DevTools → Network → Online)
7. Observe: Streaming resumes

**Expected Results:**
- ✅ Content freezes when offline
- ✅ "Reconnecting..." or similar indicator appears (if implemented)
- ✅ Content resumes updating when online
- ✅ No lost content (before == subset of after)
- ✅ Final content is complete and correct

**Test Data Attributes:**
- Message: `[data-testid="message"][data-status="generating"]`
- Content: `[data-testid="message-content"]`

**Actual Result:** _[Fill in]_

**Status:** _[PASS / FAIL / SKIP]_

**Notes:** _[Note Convex reconnect behavior]_

---

## Test 4: Multiple Devices Sync ✅❌

**Objective:** Verify real-time sync across devices

**Steps:**
1. Open conversation on **Desktop browser**
2. Send message: `"Compare Python and JavaScript in detail"`
3. **Immediately** open same conversation on **Mobile** (or second browser)
4. Observe both screens simultaneously
5. Watch streaming on both devices

**Expected Results:**
- ✅ Mobile shows generation in progress
- ✅ Both devices stream updates in sync
- ✅ Latency < 1 second between devices
- ✅ Both show identical final content

**Test Data Attributes:**
- (Same as above - use DevTools on both devices)

**Actual Result:** _[Fill in]_

**Status:** _[PASS / FAIL / SKIP]_

**Notes:** _[Note sync latency, any discrepancies]_

---

## Test 5: Long Generation (>1min) ✅❌

**Objective:** Verify persistence for long-running generations

**Steps:**
1. Send: `"Write a comprehensive 2000-word analysis of modern software architecture patterns including microservices, monoliths, serverless, and event-driven systems"`
2. Wait **30 seconds** (see partial ~500 words)
3. **Close tab**
4. Wait **2 minutes**
5. Reopen conversation

**Expected Results:**
- ✅ Full essay visible (1500-2000+ words)
- ✅ Status: `complete`
- ✅ Content is coherent, on-topic
- ✅ No timeout errors
- ✅ All sections covered

**Test Data Attributes:**
- Message: `[data-testid="message"][data-status="complete"]`
- Complete indicator: `[data-testid="message-complete"]`

**Actual Result:** _[Fill in]_

**Status:** _[PASS / FAIL / SKIP]_

**Notes:** _[Note total time, word count]_

---

## Test 6: Optimistic UI Integration ✅❌

**Objective:** Verify Phase 5 optimistic UI works with resilient generation

**Steps:**
1. Send message: `"Explain React hooks"`
2. Observe: Message appears **instantly** (optimistic)
3. Wait 1 second - observe status transition
4. **Refresh page** during generation
5. Observe: partialContent persists

**Expected Results:**
- ✅ Message appears in **0ms** (optimistic)
- ✅ Status: `optimistic` → `generating` → `complete`
- ✅ Indicator: "Sending..." → "Generating..." → checkmark
- ✅ Refresh: optimistic → server message (seamless)

**Test Data Attributes:**
- Optimistic: `[data-testid="message-optimistic"]`
- Generating: `[data-testid="message-generating"]`
- Complete: `[data-testid="message-complete"]`

**Actual Result:** _[Fill in]_

**Status:** _[PASS / FAIL / SKIP]_

**Notes:** _[Note transition smoothness]_

---

## Summary

**Total Tests:** 6
**Passed:** _[ ]_
**Failed:** _[ ]_
**Skipped:** _[ ]_

**Critical Failures:** _[List any MUST-FIX issues]_

**Minor Issues:** _[List any nice-to-fix issues]_

**Overall Result:** ✅ PASS / ❌ FAIL / ⚠️ CONDITIONAL PASS

---

## Performance Observations

**Update Frequency:**
- Observed interval between partialContent updates: _[~100ms target]_

**Latency:**
- Token generation → visible in UI: _[<500ms target]_

**Reliability:**
- Data loss incidents: _[0 target]_

---

## Next Steps

- [ ] If **ALL PASS**: Proceed to Phase 7 (Performance Optimization)
- [ ] If **ANY FAIL**: Create GitHub issues for failures, fix before Phase 7
- [ ] If **CONDITIONAL PASS**: Document known limitations, proceed with caution

---

## Notes & Observations

_[Add any additional context, screenshots, or findings here]_

