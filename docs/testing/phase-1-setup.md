# Phase 1: Testing Setup + Resilient Generation E2E

**Priority:** P0 (Critical)
**Estimated Effort:** 2-3 hours
**Prerequisites:** None (this is the foundation)

---

## Context

blah.chat currently has no automated tests. This phase establishes the testing foundation and immediately tests the most critical feature: **resilient generation** (messages survive page refresh mid-generation).

### Why Start Here?

1. **Resilient generation is the core differentiator** - If it breaks, the app is fundamentally broken
2. **Manual test doc already exists** at `docs/testing/resilient-generation-manual.md` with defined scenarios and selectors
3. **E2E provides highest confidence** for this feature (unit tests can't catch it)
4. **Playwright already installed** (line 112 in package.json)

---

## What Already Exists (REUSE)

| Asset | Location | Purpose |
|-------|----------|---------|
| Manual test scenarios | `docs/testing/resilient-generation-manual.md` | Test cases to automate |
| data-testid selectors | Same file | `[data-testid="message"]`, `[data-status="generating"]` |
| `OptimisticMessage` type | `src/types/optimistic.ts` | Message state definitions |
| `ApiResponse<T>` type | `src/lib/api/types.ts` | API response structure |
| Playwright | `package.json` (installed) | E2E framework |
| Convex schema types | `@/convex/_generated/dataModel` | `Id<"messages">`, `Doc<"users">` |

---

## What This Phase Creates

```
blah.chat/
├── vitest.config.ts                        # Vitest configuration
├── playwright.config.ts                    # Playwright configuration
├── e2e/
│   └── resilient-generation.spec.ts        # E2E tests (automates manual doc)
├── src/lib/test/
│   ├── setup.ts                            # Test setup (vitest)
│   └── factories.ts                        # Data factories (reuses existing types)
└── package.json                            # Updated scripts
```

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
bun add -d vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event jsdom @vitejs/plugin-react convex-test
```

**Note:** Playwright already installed, but init if needed:
```bash
bunx playwright install
```

### Step 2: Create vitest.config.ts

```typescript
// vitest.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/lib/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "convex/**/*.test.ts"],
    exclude: ["node_modules", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules",
        "e2e",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/convex": path.resolve(__dirname, "./convex"),
    },
  },
});
```

### Step 3: Create playwright.config.ts

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
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
  ],
  webServer: {
    command: "bun dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### Step 4: Create src/lib/test/setup.ts

```typescript
// src/lib/test/setup.ts
import "@testing-library/jest-dom/vitest";

// Global test configuration
// Reuses existing project patterns - no new types created

// Mock window.matchMedia for components that use it
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

### Step 5: Create src/lib/test/factories.ts

```typescript
// src/lib/test/factories.ts
//
// Data factories using EXISTING project types
// Does NOT create new types - imports from src/types/ and @/convex/

import type { OptimisticMessage, QueuedMessage } from "@/types/optimistic";
import type { ApiResponse } from "@/lib/api/types";

// Factory for OptimisticMessage - uses existing type
export function createOptimisticMessage(
  overrides: Partial<OptimisticMessage> = {}
): OptimisticMessage {
  const now = Date.now();
  return {
    _id: `temp-${crypto.randomUUID()}`,
    conversationId: "test-conversation-id" as any, // Cast for testing
    role: "user",
    content: "Test message content",
    status: "optimistic",
    createdAt: now,
    updatedAt: now,
    _creationTime: now,
    _optimistic: true,
    ...overrides,
  };
}

// Factory for API responses - uses existing ApiResponse<T> type
export function createApiResponse<T>(
  data: T,
  entity: string
): ApiResponse<T> {
  return {
    status: "success",
    sys: {
      entity,
      id: crypto.randomUUID(),
      timestamps: {
        retrieved: new Date().toISOString(),
      },
    },
    data,
  };
}

export function createApiError(
  message: string,
  code?: string
): ApiResponse<never> {
  return {
    status: "error",
    sys: {
      entity: "error",
    },
    error: code ? { message, code } : message,
  };
}

// Factory for QueuedMessage - uses existing type
export function createQueuedMessage(
  overrides: Partial<QueuedMessage> = {}
): QueuedMessage {
  return {
    id: crypto.randomUUID(),
    conversationId: "test-conversation-id" as any,
    content: "Queued test message",
    timestamp: Date.now(),
    retries: 0,
    ...overrides,
  };
}
```

### Step 6: Create e2e/resilient-generation.spec.ts

This automates the existing manual test doc at `docs/testing/resilient-generation-manual.md`:

```typescript
// e2e/resilient-generation.spec.ts
//
// Automates: docs/testing/resilient-generation-manual.md
// Uses EXISTING data-testid selectors from that document

import { test, expect } from "@playwright/test";

// Selectors from existing manual test doc
const SELECTORS = {
  message: '[data-testid="message"]',
  messageContent: '[data-testid="message-content"]',
  messageGenerating: '[data-testid="message-generating"]',
  messageComplete: '[data-testid="message-complete"]',
  messageOptimistic: '[data-testid="message-optimistic"]',
  statusGenerating: '[data-status="generating"]',
  statusComplete: '[data-status="complete"]',
  chatInput: '[data-testid="chat-input"]', // Adjust based on actual selector
  sendButton: '[data-testid="send-button"]', // Adjust based on actual selector
};

test.describe("Resilient Generation", () => {
  // From Manual Test 1: Refresh Mid-Generation
  test("Test 1: message survives page refresh mid-generation", async ({ page }) => {
    // Navigate to chat
    await page.goto("/chat");

    // Wait for auth (adjust based on auth flow)
    await page.waitForSelector(SELECTORS.chatInput, { timeout: 10000 });

    // Send message that triggers long response
    const prompt = "Write a detailed 500-word essay about React hooks and their benefits";
    await page.fill(SELECTORS.chatInput, prompt);
    await page.click(SELECTORS.sendButton);

    // Wait for generation to start (partial content visible)
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 10000 });

    // Capture partial content before refresh
    const partialContentBefore = await page
      .locator(`${SELECTORS.message}${SELECTORS.statusGenerating}`)
      .locator(SELECTORS.messageContent)
      .textContent();

    // Ensure some content exists
    expect(partialContentBefore).toBeTruthy();
    expect(partialContentBefore!.length).toBeGreaterThan(10);

    // REFRESH mid-generation
    await page.reload();

    // Wait for page to load
    await page.waitForSelector(SELECTORS.message, { timeout: 10000 });

    // Verify partial content persisted (or generation continued)
    const messageAfterRefresh = page.locator(SELECTORS.message).last();
    await expect(messageAfterRefresh).toBeVisible();

    // Content should be at least as long as before (generation continued)
    const contentAfterRefresh = await messageAfterRefresh
      .locator(SELECTORS.messageContent)
      .textContent();
    expect(contentAfterRefresh).toBeTruthy();

    // Wait for completion
    await page.waitForSelector(SELECTORS.statusComplete, { timeout: 120000 });

    // Final content should be complete
    const finalContent = await page
      .locator(`${SELECTORS.message}${SELECTORS.statusComplete}`)
      .last()
      .locator(SELECTORS.messageContent)
      .textContent();

    // Verify substantial content (500-word essay)
    expect(finalContent!.split(/\s+/).length).toBeGreaterThan(200);
  });

  // From Manual Test 2: Close Tab Mid-Generation
  test("Test 2: generation continues after tab close and reopen", async ({ page, context }) => {
    await page.goto("/chat");
    await page.waitForSelector(SELECTORS.chatInput, { timeout: 10000 });

    // Get current URL to reopen
    const chatUrl = page.url();

    // Send message
    const prompt = "Write a detailed 500-word essay about TypeScript features";
    await page.fill(SELECTORS.chatInput, prompt);
    await page.click(SELECTORS.sendButton);

    // Wait for generation to start
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 10000 });

    // Wait 2-3 seconds for some content
    await page.waitForTimeout(3000);

    // Close tab
    await page.close();

    // Wait 10 seconds (server continues)
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Open new tab
    const newPage = await context.newPage();
    await newPage.goto(chatUrl);

    // Message should exist (either generating or complete)
    await newPage.waitForSelector(SELECTORS.message, { timeout: 10000 });

    // Should have content
    const content = await newPage
      .locator(SELECTORS.message)
      .last()
      .locator(SELECTORS.messageContent)
      .textContent();

    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(50);

    // If still generating, wait for complete
    const status = await newPage
      .locator(SELECTORS.message)
      .last()
      .getAttribute("data-status");

    if (status === "generating") {
      await newPage.waitForSelector(SELECTORS.statusComplete, { timeout: 120000 });
    }
  });

  // From Manual Test 3: Network Disconnect
  test("Test 3: streaming resumes after network reconnect", async ({ page, context }) => {
    await page.goto("/chat");
    await page.waitForSelector(SELECTORS.chatInput, { timeout: 10000 });

    // Send message
    const prompt = "Explain quantum computing in 300 words";
    await page.fill(SELECTORS.chatInput, prompt);
    await page.click(SELECTORS.sendButton);

    // Wait for generation
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 10000 });

    // Capture content before offline
    await page.waitForTimeout(2000);
    const contentBefore = await page
      .locator(`${SELECTORS.message}${SELECTORS.statusGenerating}`)
      .locator(SELECTORS.messageContent)
      .textContent();

    // Go offline
    await context.setOffline(true);

    // Wait a bit (content frozen)
    await page.waitForTimeout(3000);

    // Go back online
    await context.setOffline(false);

    // Wait for streaming to resume and complete
    await page.waitForSelector(SELECTORS.statusComplete, { timeout: 120000 });

    // Verify content is complete and contains pre-offline content
    const finalContent = await page
      .locator(`${SELECTORS.message}${SELECTORS.statusComplete}`)
      .locator(SELECTORS.messageContent)
      .textContent();

    expect(finalContent).toBeTruthy();
    expect(finalContent!.includes(contentBefore!.substring(0, 50))).toBe(true);
  });

  // From Manual Test 5: Long Generation
  test("Test 5: long generation (>1min) completes without timeout", async ({ page }) => {
    test.setTimeout(300000); // 5 min timeout for this test

    await page.goto("/chat");
    await page.waitForSelector(SELECTORS.chatInput, { timeout: 10000 });

    // Send long-form prompt
    const prompt = "Write a comprehensive 2000-word analysis of modern software architecture patterns including microservices, monoliths, serverless, and event-driven systems";
    await page.fill(SELECTORS.chatInput, prompt);
    await page.click(SELECTORS.sendButton);

    // Wait for generation to start
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 10000 });

    // Close tab after 30 seconds
    await page.waitForTimeout(30000);

    const chatUrl = page.url();
    await page.close();

    // Wait 2 minutes
    await new Promise(resolve => setTimeout(resolve, 120000));

    // Reopen
    const newPage = await page.context().newPage();
    await newPage.goto(chatUrl);

    // Should be complete
    await newPage.waitForSelector(SELECTORS.statusComplete, { timeout: 60000 });

    // Verify substantial content
    const finalContent = await newPage
      .locator(`${SELECTORS.message}${SELECTORS.statusComplete}`)
      .last()
      .locator(SELECTORS.messageContent)
      .textContent();

    // Should have 1500+ words
    expect(finalContent!.split(/\s+/).length).toBeGreaterThan(1000);
  });

  // From Manual Test 6: Optimistic UI Integration
  test("Test 6: optimistic UI transitions correctly", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForSelector(SELECTORS.chatInput, { timeout: 10000 });

    // Prepare to capture timing
    const prompt = "Explain React hooks";

    // Send message
    const sendTime = Date.now();
    await page.fill(SELECTORS.chatInput, prompt);
    await page.click(SELECTORS.sendButton);

    // Optimistic message should appear instantly
    await page.waitForSelector(SELECTORS.messageOptimistic, { timeout: 500 });
    const optimisticTime = Date.now();

    // Should appear in <100ms (optimistic)
    expect(optimisticTime - sendTime).toBeLessThan(500);

    // Transition to generating
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 5000 });

    // Refresh
    await page.reload();

    // After refresh, should see server message (not optimistic)
    await page.waitForSelector(SELECTORS.message, { timeout: 10000 });

    // Wait for completion
    await page.waitForSelector(SELECTORS.statusComplete, { timeout: 120000 });
  });
});

// Test 4 (Multiple Devices) requires manual testing or complex setup
// Left as manual test per docs/testing/resilient-generation-manual.md
```

### Step 7: Update package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Verification

After implementation, run:

```bash
# Unit tests (will have none yet, but config should work)
bun run test

# E2E tests (requires dev server + auth)
bun run test:e2e
```

### Expected Outcomes:
- Vitest runs without errors (0 tests initially)
- Playwright executes resilient generation tests
- Tests pass when resilient generation works correctly

---

## What Comes Next

**Phase 2: API Route Integration Tests**
- Build on factories.ts for mock data
- Test API envelope pattern (`formatEntity`)
- Test auth middleware

---

## Troubleshooting

### E2E Tests Fail on Auth
The tests assume a logged-in user. Options:
1. Use test account with env vars for credentials
2. Create auth setup fixture in Playwright
3. Use Clerk test mode

### data-testid Selectors Missing
The manual doc references selectors that may not exist in components yet. If tests fail on missing selectors:
1. Add `data-testid` attributes to components
2. Add `data-status` for message state

### Convex Connection Issues
E2E tests need real Convex backend. Ensure:
1. Dev server running with Convex
2. Test account has valid Clerk session
3. Network allows WebSocket connections
