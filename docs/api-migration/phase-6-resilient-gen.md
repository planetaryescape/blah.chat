# Phase 6: Resilient Generation Validation

## Overview

Validate that resilient message generation (the core feature) still works after API migration. Ensure page refresh mid-generation doesn't lose responses. Test partialContent updates via SSE.

## Context & Grand Scope

### Why This Phase Exists
Resilient generation is blah.chat's critical differentiator: "Never lose AI responses, even if you close the tab mid-generation." All previous phases (0-5) are infrastructure - Phase 6 validates the infrastructure actually delivers on this promise.

### Dependencies
- **Previous phases**: All (0-5) - foundation, mutations, queries, actions, real-time ✅
- **Blocks**: Phase 7 (performance - can't optimize what isn't working)
- **Critical path**: MUST PASS before production launch

## Research & Decision Rationale

### Industry Patterns Analyzed

**1. Resilient Generation Approaches**

| Pattern | Implementation | Pros | Cons | Used By |
|---------|---------------|------|------|---------|
| **Client-only Streaming** | `useChat()` hook stores state | Simple | Loses data on refresh | AI SDK examples |
| **Server Polling** | Client polls `/api/messages/:id` | Survives refresh | High latency (5-10s) | Simple apps |
| **Server Streaming + DB** | SSE + periodic DB writes | Survives refresh, low latency | Complex | **ChatGPT** |
| **WebSocket + DB** | WS + DB writes | Real-time | Requires SDK | Slack, Discord |

**ChatGPT Implementation**:
1. User sends message → DB insert (status: "pending")
2. Server action generates response → SSE streams tokens
3. Every 100ms: Write partialContent to DB
4. On complete: Write final content to DB
5. On refresh: Client fetches from DB, sees partial or complete content

**blah.chat (Current)**:
- Convex action generates response (server-side, up to 10min)
- `UPDATE_INTERVAL = 100ms` (see `convex/generation.ts:807`)
- partialContent updates every 100ms via Convex subscription (WebSocket)
- On refresh: Convex query fetches latest partialContent

**2. Failure Modes to Test**

| Scenario | Expected Behavior | Test Method |
|----------|-------------------|-------------|
| Page refresh mid-generation | Shows partial content, continues | Refresh browser |
| Tab close → reopen | Shows complete response | Close/reopen tab |
| Network disconnect → reconnect | Resumes from last partialContent | Offline mode |
| Server crash mid-generation | Marks as "error", retryable | Kill server process |
| Browser crash | Shows last saved partialContent | Force quit browser |

**3. Performance Requirements**

Industry standards:
- Latency: <500ms from token to UI (ChatGPT: ~200ms)
- Update frequency: 50-100ms (smooth streaming feel)
- Reliability: 99.9% of generations survive refresh

### Decisions Made

**Decision 1: Keep Convex Actions for Generation**
- Don't migrate generation to API routes (yet)
- Reason: Convex actions proven, 10min timeout, already resilient
- API routes: 60s timeout (Vercel), complex streaming

**Decision 2: SSE for partialContent Updates**
- Replace Convex subscription with SSE (mobile compatibility)
- Keep 100ms update frequency
- Reason: Real-time feel, battery-efficient

**Decision 3: Validation-First Approach**
- Phase 6: Validate existing pattern works with new infrastructure
- Phase 7: Optimize (caching, performance)
- Phase 8: Document

**Decision 4: Test Matrix**
- 5 failure scenarios × 3 generation stages (start, mid, end) = 15 tests
- Automated test suite (Playwright)
- Manual testing checklist

## Current State Analysis

### How blah.chat Works Today

**1. Message Generation Flow (Convex)**
```typescript
// convex/chat.ts:45-120
export const send = mutation({
  handler: async (ctx, args) => {
    // 1. Insert user message
    const userMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      status: "complete",
      createdAt: Date.now(),
    });

    // 2. Insert assistant message (placeholder)
    const assistantMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: "",
      status: "pending",
      createdAt: Date.now(),
    });

    // 3. Schedule generation action (server-side)
    await ctx.scheduler.runAfter(0, internal.generation.generate, {
      messageId: assistantMessageId,
      conversationId: args.conversationId,
      modelId: args.modelId,
    });

    return userMessageId;
  },
});
```

**2. Generation Action (Server-Side)**
```typescript
// convex/generation.ts:120-250
const UPDATE_INTERVAL = 100; // ms (line 807)

export const generate = action({
  handler: async (ctx, args) => {
    // Mark as generating
    await ctx.runMutation(internal.messages.updateStatus, {
      id: args.messageId,
      status: "generating",
      generationStartedAt: Date.now(),
    });

    try {
      // Stream from LLM
      const stream = await openai.chat.completions.create({
        model: args.modelId,
        messages: [...conversationHistory],
        stream: true,
      });

      let fullContent = "";
      let lastUpdateTime = Date.now();

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullContent += content;

        // Update DB every 100ms
        if (Date.now() - lastUpdateTime > UPDATE_INTERVAL) {
          await ctx.runMutation(internal.messages.updatePartial, {
            id: args.messageId,
            partialContent: fullContent,
          });
          lastUpdateTime = Date.now();
        }
      }

      // Final update
      await ctx.runMutation(internal.messages.complete, {
        id: args.messageId,
        content: fullContent,
        status: "complete",
        generationCompletedAt: Date.now(),
      });
    } catch (error) {
      // Mark as error
      await ctx.runMutation(internal.messages.updateStatus, {
        id: args.messageId,
        status: "error",
        error: error.message,
        generationCompletedAt: Date.now(),
      });
    }
  },
});
```

**3. Client Subscription (Web)**
```typescript
// src/components/chat/ChatView.tsx:30-40
const messages = useQuery(api.messages.list, {
  conversationId,
});

// Convex subscription auto-updates every 100ms
// Client sees partialContent changes in real-time
```

**4. Page Refresh Behavior**
```typescript
// User refreshes page mid-generation
// 1. Page reloads
// 2. useQuery(api.messages.list) re-runs
// 3. Fetches messages from DB
// 4. Message with status="generating" + partialContent shown
// 5. Subscription resumes, continues streaming
// ✅ No data loss
```

### Specific Files/Patterns

**Generation logic** (from `/Users/bhekanik/code/planetaryescape/blah.chat/`):
1. `convex/chat.ts:45-120` - Message creation + action scheduling
2. `convex/generation.ts:120-250` - LLM streaming + partialContent updates
3. `convex/generation.ts:807` - `UPDATE_INTERVAL = 100` constant
4. `convex/messages.ts:80-100` - partialContent update mutation
5. `src/components/chat/ChatMessage.tsx:50-80` - Display partialContent or content

**Critical constants**:
- `UPDATE_INTERVAL = 100ms` - Update frequency (line 807)
- `MAX_GENERATION_TIME = 600000ms` - 10min timeout (Convex action limit)

## Target State

### What We're Building

**No new code** - Phase 6 is validation, not implementation.

**Test suite**:
```
tests/
├── e2e/
│   └── resilient-generation.spec.ts    # Playwright tests
└── integration/
    └── generation-api.test.ts          # API integration tests
```

### Success Looks Like

**1. Test: Refresh Mid-Generation**
```typescript
// Playwright test
test("survives page refresh mid-generation", async ({ page }) => {
  // 1. Send message
  await page.fill("[data-testid=chat-input]", "Write a long essay about React");
  await page.click("[data-testid=send-button]");

  // 2. Wait for generation to start (see partial content)
  await page.waitForSelector("[data-testid=message-generating]");
  const partialBefore = await page.textContent("[data-testid=message-content]");

  // 3. Refresh page
  await page.reload();

  // 4. Verify partial content still visible
  await page.waitForSelector("[data-testid=message-generating]");
  const partialAfter = await page.textContent("[data-testid=message-content]");

  expect(partialAfter).toContain(partialBefore); // Should have at least same content
  expect(partialAfter.length).toBeGreaterThanOrEqual(partialBefore.length); // Likely more

  // 5. Wait for completion
  await page.waitForSelector("[data-testid=message-complete]", { timeout: 60000 });
  const finalContent = await page.textContent("[data-testid=message-content]");

  expect(finalContent.length).toBeGreaterThan(100); // Essay should be long
  expect(finalContent).toContain("React"); // On-topic
});
```

**2. Test: Close Tab → Reopen**
```typescript
test("continues generation after tab close", async ({ browser }) => {
  const page = await browser.newPage();

  // Send message
  await page.fill("[data-testid=chat-input]", "Long essay");
  await page.click("[data-testid=send-button]");

  // Wait for generation start
  await page.waitForSelector("[data-testid=message-generating]");

  // Close tab
  await page.close();

  // Wait 5s (generation continues server-side)
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Reopen tab
  const newPage = await browser.newPage();
  await newPage.goto("http://localhost:3000/chat/same-conversation-id");

  // Should see completed or generating message
  const message = await newPage.waitForSelector("[data-testid=message]");
  const status = await message.getAttribute("data-status");

  expect(["generating", "complete"]).toContain(status);
});
```

**3. Test: Network Disconnect**
```typescript
test("resumes after network disconnect", async ({ page, context }) => {
  // Send message
  await page.fill("[data-testid=chat-input]", "Essay");
  await page.click("[data-testid=send-button]");

  // Wait for generation
  await page.waitForSelector("[data-testid=message-generating]");

  // Disconnect network
  await context.setOffline(true);

  // Wait 3s
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Reconnect
  await context.setOffline(false);

  // Should auto-reconnect and show latest content
  await page.waitForSelector("[data-testid=message-complete]", { timeout: 30000 });

  const content = await page.textContent("[data-testid=message-content]");
  expect(content.length).toBeGreaterThan(50);
});
```

**4. Manual Test Checklist**
```markdown
## Resilient Generation Manual Test Checklist

### Test 1: Refresh Mid-Generation
- [ ] Open chat, send message "Write a 500-word essay about TypeScript"
- [ ] Wait 2-3s (see partial content streaming)
- [ ] Refresh page (Cmd+R / Ctrl+R)
- [ ] Expected: Partial content still visible, continues streaming
- [ ] Wait for completion
- [ ] Expected: Full essay displayed, no data loss

### Test 2: Close Tab Mid-Generation
- [ ] Send same message
- [ ] Wait 2-3s
- [ ] Close tab
- [ ] Wait 10s
- [ ] Reopen same conversation
- [ ] Expected: Message complete or nearly complete

### Test 3: Browser Crash
- [ ] Send message
- [ ] Wait 2-3s
- [ ] Force quit browser (Activity Monitor / Task Manager)
- [ ] Reopen browser, navigate to conversation
- [ ] Expected: Partial content from before crash

### Test 4: Multiple Devices
- [ ] Open conversation on Device A (desktop)
- [ ] Send message
- [ ] Immediately open same conversation on Device B (mobile)
- [ ] Expected: See generation in progress, streaming updates

### Test 5: Long Generation (>5min)
- [ ] Send "Write a 5000-word essay about the history of computing"
- [ ] Close tab after 1min
- [ ] Wait 5min
- [ ] Reopen conversation
- [ ] Expected: Full 5000-word essay displayed
```

## Implementation Steps

### Step 1: Create Playwright Test Suite

**Goal**: Automated testing of resilient generation

**Action**: Create E2E test file

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/tests/e2e/resilient-generation.spec.ts`

**Code**:
```typescript
// tests/e2e/resilient-generation.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Resilient Generation", () => {
  test.beforeEach(async ({ page }) => {
    // Login (use test account)
    await page.goto("http://localhost:3000/sign-in");
    await page.fill("[name=email]", process.env.TEST_EMAIL);
    await page.fill("[name=password]", process.env.TEST_PASSWORD);
    await page.click("[type=submit]");

    // Navigate to test conversation
    await page.goto("http://localhost:3000/chat/test-conversation-id");
  });

  test("survives page refresh mid-generation", async ({ page }) => {
    // Send message
    await page.fill("[data-testid=chat-input]", "Write a long essay about React hooks");
    await page.click("[data-testid=send-button]");

    // Wait for generation to start
    await page.waitForSelector("[data-testid=message-generating]", {
      timeout: 5000,
    });

    // Get partial content
    const partialBefore = await page
      .locator("[data-testid=message-content]")
      .last()
      .textContent();

    // Refresh page
    await page.reload();

    // Wait for generation indicator
    await page.waitForSelector("[data-testid=message-generating]", {
      timeout: 5000,
    });

    // Get partial content after refresh
    const partialAfter = await page
      .locator("[data-testid=message-content]")
      .last()
      .textContent();

    // Verify content persisted
    expect(partialAfter).toBeTruthy();
    expect(partialAfter?.length).toBeGreaterThan(0);

    // Wait for completion
    await page.waitForSelector("[data-testid=message-complete]", {
      timeout: 60000,
    });

    const finalContent = await page
      .locator("[data-testid=message-content]")
      .last()
      .textContent();

    // Verify complete content
    expect(finalContent?.length).toBeGreaterThan(100);
    expect(finalContent).toContain("React");
  });

  test("continues after tab close", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/chat/test-conversation-id");

    // Send message
    await page.fill("[data-testid=chat-input]", "Long essay");
    await page.click("[data-testid=send-button]");

    // Wait for start
    await page.waitForSelector("[data-testid=message-generating]");

    // Get message ID
    const messageId = await page
      .locator("[data-testid=message]")
      .last()
      .getAttribute("data-message-id");

    // Close tab
    await page.close();

    // Wait for generation (server-side)
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Reopen
    const newPage = await browser.newPage();
    await newPage.goto("http://localhost:3000/chat/test-conversation-id");

    // Find message
    const message = await newPage.locator(`[data-message-id="${messageId}"]`);

    // Should be complete or generating
    const status = await message.getAttribute("data-status");
    expect(["generating", "complete"]).toContain(status);

    // If still generating, wait for complete
    if (status === "generating") {
      await newPage.waitForSelector(`[data-message-id="${messageId}"][data-status="complete"]`, {
        timeout: 60000,
      });
    }

    // Verify content exists
    const content = await message.locator("[data-testid=message-content]").textContent();
    expect(content?.length).toBeGreaterThan(50);
  });

  test("resumes after network disconnect", async ({ page, context }) => {
    // Send message
    await page.fill("[data-testid=chat-input]", "Essay");
    await page.click("[data-testid=send-button]");

    // Wait for start
    await page.waitForSelector("[data-testid=message-generating]");

    // Disconnect
    await context.setOffline(true);

    // Wait
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Reconnect
    await context.setOffline(false);

    // Should resume
    await page.waitForSelector("[data-testid=message-complete]", {
      timeout: 60000,
    });

    const content = await page
      .locator("[data-testid=message-content]")
      .last()
      .textContent();

    expect(content?.length).toBeGreaterThan(50);
  });
});
```

### Step 2: Add Test Data Attributes

**Goal**: Make components testable

**Action**: Add data-testid attributes to chat components

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ChatMessage.tsx`
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ChatInput.tsx`

**Code**:
```typescript
// src/components/chat/ChatMessage.tsx
export function ChatMessage({ message }: { message: Message }) {
  return (
    <div
      data-testid="message"
      data-message-id={message._id}
      data-status={message.status}
      className="message"
    >
      <div data-testid="message-content">
        {message.status === "generating" && message.partialContent
          ? message.partialContent
          : message.content}
      </div>

      {message.status === "generating" && (
        <div data-testid="message-generating">Generating...</div>
      )}

      {message.status === "complete" && (
        <div data-testid="message-complete">✓</div>
      )}

      {message.status === "error" && (
        <div data-testid="message-error">{message.error}</div>
      )}
    </div>
  );
}
```

```typescript
// src/components/chat/ChatInput.tsx
export function ChatInput({ conversationId, modelId }: Props) {
  return (
    <form onSubmit={handleSubmit}>
      <textarea
        data-testid="chat-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message..."
      />
      <button data-testid="send-button" type="submit">
        Send
      </button>
    </form>
  );
}
```

### Step 3: Configure Playwright

**Goal**: Setup E2E testing infrastructure

**Action**: Install Playwright, configure

**Files**:
- Install: `bun add -D @playwright/test`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/playwright.config.ts`

**Code**:
```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: {
    command: "bun dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### Step 4: Run Test Suite

**Goal**: Execute all resilient generation tests

**Action**: Run Playwright tests

**Code**:
```bash
# Install Playwright browsers
bunx playwright install

# Run tests
bunx playwright test

# Run specific test
bunx playwright test resilient-generation

# Run in UI mode (debug)
bunx playwright test --ui

# Run headed (see browser)
bunx playwright test --headed
```

### Step 5: Create Manual Test Checklist

**Goal**: Human verification for edge cases

**Action**: Create markdown checklist

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/docs/testing/resilient-generation-manual.md`

**Code**:
```markdown
# Resilient Generation Manual Testing

## Prerequisites
- Local dev server running (`bun dev`)
- Test account logged in
- Create new conversation for each test

## Test Suite

### Test 1: Refresh Mid-Generation ✅❌
**Steps:**
1. Send message: "Write a 500-word essay about TypeScript"
2. Wait 2-3 seconds (observe streaming)
3. Note partial content length (approx)
4. Press Cmd+R / Ctrl+R (hard refresh)
5. Observe: Partial content still visible
6. Wait for completion (30-60s)

**Expected:**
- ✅ Partial content persists after refresh
- ✅ Streaming resumes from last checkpoint
- ✅ Final content is complete essay (500+ words)
- ✅ No duplicate content
- ✅ No "jump" or flicker in UI

**Actual:** _[Fill in during test]_

---

### Test 2: Close Tab Mid-Generation ✅❌
**Steps:**
1. Send same message
2. Wait 2-3 seconds
3. Close browser tab (Cmd+W / Ctrl+W)
4. Wait 10 seconds
5. Open new tab, navigate to same conversation

**Expected:**
- ✅ Message visible (status: complete or generating)
- ✅ If generating: see partial content
- ✅ If complete: see full essay

**Actual:** _[Fill in]_

---

### Test 3: Force Quit Browser ✅❌
**Steps:**
1. Send message
2. Wait 2-3 seconds (see partial)
3. Force quit browser (Activity Monitor / Task Manager)
4. Reopen browser
5. Navigate to conversation

**Expected:**
- ✅ Partial content from before crash visible
- ✅ Generation continues (if still running)
- ✅ Or complete content (if finished during downtime)

**Actual:** _[Fill in]_

---

### Test 4: Multiple Devices Sync ✅❌
**Steps:**
1. Open conversation on Desktop
2. Send message
3. Immediately open same conversation on Mobile
4. Observe both screens

**Expected:**
- ✅ Mobile shows generation in progress
- ✅ Both devices update in sync
- ✅ Latency <1s between devices

**Actual:** _[Fill in]_

---

### Test 5: Long Generation (>5min) ✅❌
**Steps:**
1. Send: "Write a detailed 5000-word essay on the history of computing from 1940-2024"
2. Wait 1 minute (see partial)
3. Close tab
4. Wait 5 minutes
5. Reopen conversation

**Expected:**
- ✅ Full essay visible (5000+ words)
- ✅ Status: complete
- ✅ Content coherent, on-topic

**Actual:** _[Fill in]_

---

### Test 6: Network Flaky ✅❌
**Steps:**
1. Send message
2. During generation: Toggle DevTools Network throttling (Offline → Online repeatedly)
3. Observe behavior

**Expected:**
- ✅ "Reconnecting..." indicator appears
- ✅ Updates resume when online
- ✅ No lost content
- ✅ Final result correct

**Actual:** _[Fill in]_

---

## Summary
- **Passed:** _[X / 6]_
- **Failed:** _[X / 6]_
- **Blockers:** _[List any critical failures]_
```

### Step 6: Validate Update Frequency

**Goal**: Verify 100ms partialContent updates

**Action**: Add logging, measure intervals

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/convex/generation.ts`

**Code**:
```typescript
// convex/generation.ts
const UPDATE_INTERVAL = 100; // ms

export const generate = action({
  handler: async (ctx, args) => {
    // ... existing code ...

    let fullContent = "";
    let lastUpdateTime = Date.now();
    let updateCount = 0;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullContent += content;

      const now = Date.now();
      if (now - lastUpdateTime > UPDATE_INTERVAL) {
        await ctx.runMutation(internal.messages.updatePartial, {
          id: args.messageId,
          partialContent: fullContent,
        });

        updateCount++;
        const actualInterval = now - lastUpdateTime;

        // Log update frequency (debug)
        console.log(`Update ${updateCount}: ${actualInterval}ms since last`);

        lastUpdateTime = now;
      }
    }

    console.log(`Total updates: ${updateCount}`);
    console.log(`Average interval: ${Date.now() / updateCount}ms`);

    // ... complete message ...
  },
});
```

### Step 7: Document Findings

**Goal**: Record test results

**Action**: Create test report

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/docs/testing/resilient-generation-report.md`

**Code** (template):
```markdown
# Resilient Generation Test Report

**Date:** 2025-12-10
**Tester:** [Name]
**Environment:** Local dev (macOS/Windows/Linux)
**Browser:** Chrome 120

## Automated Tests (Playwright)

| Test | Result | Duration | Notes |
|------|--------|----------|-------|
| Refresh mid-generation | ✅ PASS | 45s | Partial content persisted |
| Close tab | ✅ PASS | 15s | Generation continued server-side |
| Network disconnect | ✅ PASS | 35s | Auto-reconnect worked |

## Manual Tests

| Test | Result | Notes |
|------|--------|-------|
| Force quit browser | ✅ PASS | Partial content from 3s before crash visible |
| Multiple devices | ✅ PASS | Sync latency <500ms |
| Long generation (>5min) | ✅ PASS | 5200-word essay, all coherent |

## Performance Metrics

- **Update Frequency:** 102ms average (target: 100ms) ✅
- **Latency:** 320ms token-to-UI (target: <500ms) ✅
- **Reliability:** 6/6 tests passed (target: 100%) ✅

## Issues Found

1. **Issue #1:** [Description]
   - Severity: Critical/High/Medium/Low
   - Steps to reproduce: ...
   - Workaround: ...

_(No issues found)_

## Conclusion

✅ **PASS** - Resilient generation working as expected. Ready for Phase 7.
```

## Testing & Validation

See implementation steps above - entire phase is testing.

**Key metrics**:
- ✅ 100% automated tests pass
- ✅ 100% manual tests pass
- ✅ Update frequency: 100ms ± 20ms
- ✅ Latency: <500ms token-to-UI
- ✅ Zero data loss across all scenarios

## Success Criteria

- [ ] Playwright test suite created (3+ tests)
- [ ] All automated tests pass
- [ ] Manual test checklist completed (6 tests)
- [ ] All manual tests pass
- [ ] Update frequency validated (100ms)
- [ ] No data loss in any scenario
- [ ] Documentation complete (test report)
- [ ] Team sign-off (product + engineering)

## Common Pitfalls

### Pitfall 1: Flaky Tests
**Problem**: Tests pass sometimes, fail others (timing issues)
**Solution**: Use `waitFor` with generous timeouts, retry on failure

### Pitfall 2: Test Data Pollution
**Problem**: Tests interfere with each other (shared DB)
**Solution**: Create/delete test conversations per test

### Pitfall 3: Ignoring Edge Cases
**Problem**: Tests pass in happy path, fail in production
**Solution**: Test network failures, slow connections, browser crashes

### Pitfall 4: Not Testing on Mobile
**Problem**: Works on desktop, breaks on mobile
**Solution**: Run Playwright tests with Mobile Chrome device emulation

### Pitfall 5: Assuming Real-Time = Correct
**Problem**: Messages stream fast but with errors/gaps
**Solution**: Validate final content correctness, not just speed

## Next Steps

After completing Phase 6:

**Immediate next**: [Phase 7: Performance Optimization](./phase-7-performance.md)
- Caching strategies (HTTP cache, React Query, CDN)
- Bundle size reduction
- Database query optimization
- Monitoring setup

**Blockers** (must fix before Phase 7):
- Any test failures from Phase 6
- Critical bugs discovered during testing
- Performance regressions (>2x slower than Convex)

**Testing checklist before Phase 7**:
1. All Playwright tests pass ✅
2. All manual tests pass ✅
3. Update frequency validated ✅
4. Zero data loss ✅
5. Team approved ✅

Ready for Phase 7: Performance optimization and production readiness.
