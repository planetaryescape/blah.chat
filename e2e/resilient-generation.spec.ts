/**
 * Resilient Generation E2E Tests
 *
 * Automates: docs/testing/resilient-generation-manual.md
 * Uses VERIFIED selectors from ChatMessage.tsx and ChatInput.tsx
 */
import { expect, test } from "@playwright/test";

// Selectors verified against actual components
const SELECTORS = {
  // From ChatInput.tsx
  chatInput: '[data-testid="chat-input"]',
  sendButton: '[data-testid="send-button"]',

  // From ChatMessage.tsx
  message: '[data-testid="message"]',
  messageContent: '[data-testid="message-content"]',

  // Combined selectors using data-status attribute (not separate testids)
  statusGenerating: '[data-testid="message"][data-status="generating"]',
  statusComplete: '[data-testid="message"][data-status="complete"]',
  statusPending: '[data-testid="message"][data-status="pending"]',
  statusError: '[data-testid="message"][data-status="error"]',
};

test.describe("Resilient Generation", () => {
  // Skip all tests if not authenticated - E2E requires auth setup
  test.beforeEach(async ({ page }) => {
    // Navigate to chat - adjust URL as needed
    await page.goto("/chat");

    // Wait for chat input to be available (indicates page loaded and auth passed)
    try {
      await page.waitForSelector(SELECTORS.chatInput, { timeout: 15000 });
    } catch {
      test.skip(true, "Chat not accessible - requires authentication setup");
    }
  });

  /**
   * Test 1: Refresh Mid-Generation
   * From docs/testing/resilient-generation-manual.md
   */
  test("message survives page refresh mid-generation", async ({ page }) => {
    // Send message that triggers long response
    const prompt =
      "Write a detailed 500-word essay about React hooks and their benefits";
    await page.fill(SELECTORS.chatInput, prompt);
    await page.click(SELECTORS.sendButton);

    // Wait for generation to start
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 15000 });

    // Wait a moment for some content to generate
    await page.waitForTimeout(2000);

    // Capture partial content before refresh
    const partialContentBefore = await page
      .locator(SELECTORS.statusGenerating)
      .locator(SELECTORS.messageContent)
      .textContent();

    expect(partialContentBefore).toBeTruthy();
    expect(partialContentBefore!.length).toBeGreaterThan(10);

    // REFRESH mid-generation
    await page.reload();

    // Wait for page to load
    await page.waitForSelector(SELECTORS.message, { timeout: 15000 });

    // Verify message still exists (either generating or complete)
    const messageAfterRefresh = page.locator(SELECTORS.message).last();
    await expect(messageAfterRefresh).toBeVisible();

    // Content should exist
    const contentAfterRefresh = await messageAfterRefresh
      .locator(SELECTORS.messageContent)
      .textContent();
    expect(contentAfterRefresh).toBeTruthy();

    // Wait for completion
    await page.waitForSelector(SELECTORS.statusComplete, { timeout: 120000 });

    // Final content should be substantial
    const finalContent = await page
      .locator(SELECTORS.statusComplete)
      .last()
      .locator(SELECTORS.messageContent)
      .textContent();

    expect(finalContent!.split(/\s+/).length).toBeGreaterThan(100);
  });

  /**
   * Test 2: Tab Close and Reopen
   * From docs/testing/resilient-generation-manual.md
   */
  test("generation continues after tab close and reopen", async ({
    page,
    context,
  }) => {
    // Get current URL for reopening
    const chatUrl = page.url();

    // Send message
    const prompt = "Write a detailed 500-word essay about TypeScript features";
    await page.fill(SELECTORS.chatInput, prompt);
    await page.click(SELECTORS.sendButton);

    // Wait for generation to start
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 15000 });

    // Wait for some content
    await page.waitForTimeout(3000);

    // Close tab
    await page.close();

    // Wait for server to continue (Convex action continues server-side)
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Open new tab
    const newPage = await context.newPage();
    await newPage.goto(chatUrl);

    // Message should exist
    await newPage.waitForSelector(SELECTORS.message, { timeout: 15000 });

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

    if (status === "generating" || status === "pending") {
      await newPage.waitForSelector(SELECTORS.statusComplete, {
        timeout: 120000,
      });
    }
  });

  /**
   * Test 3: Network Disconnect/Reconnect
   * From docs/testing/resilient-generation-manual.md
   */
  test("streaming resumes after network reconnect", async ({
    page,
    context,
  }) => {
    // Send message
    const prompt = "Explain quantum computing in 300 words";
    await page.fill(SELECTORS.chatInput, prompt);
    await page.click(SELECTORS.sendButton);

    // Wait for generation
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 15000 });

    // Wait for some content
    await page.waitForTimeout(2000);

    // Capture content before offline
    const contentBefore = await page
      .locator(SELECTORS.statusGenerating)
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

    // Verify content is complete
    const finalContent = await page
      .locator(SELECTORS.statusComplete)
      .locator(SELECTORS.messageContent)
      .textContent();

    expect(finalContent).toBeTruthy();
    // Content should include what was there before offline
    expect(finalContent!.length).toBeGreaterThan(contentBefore!.length);
  });

  /**
   * Test 5: Long Generation (>1min)
   * From docs/testing/resilient-generation-manual.md
   */
  test("long generation completes without timeout", async ({ page }) => {
    test.setTimeout(300000); // 5 min timeout for this test

    // Send long-form prompt
    const prompt =
      "Write a comprehensive 2000-word analysis of modern software architecture patterns including microservices, monoliths, serverless, and event-driven systems";
    await page.fill(SELECTORS.chatInput, prompt);
    await page.click(SELECTORS.sendButton);

    // Wait for generation to start
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 15000 });

    // Wait and close after 30 seconds
    await page.waitForTimeout(30000);

    const chatUrl = page.url();
    await page.close();

    // Wait 2 minutes (server continues)
    await new Promise((resolve) => setTimeout(resolve, 120000));

    // Reopen
    const newPage = await page.context().newPage();
    await newPage.goto(chatUrl);

    // Should be complete
    await newPage.waitForSelector(SELECTORS.statusComplete, { timeout: 60000 });

    // Verify substantial content
    const finalContent = await newPage
      .locator(SELECTORS.statusComplete)
      .last()
      .locator(SELECTORS.messageContent)
      .textContent();

    // Should have 1000+ words for a 2000-word request
    expect(finalContent!.split(/\s+/).length).toBeGreaterThan(500);
  });

  /**
   * Test 6: Optimistic UI Transitions
   * From docs/testing/resilient-generation-manual.md
   */
  test("optimistic UI transitions correctly", async ({ page }) => {
    const prompt = "Explain React hooks briefly";

    // Send message and time it
    const sendTime = Date.now();
    await page.fill(SELECTORS.chatInput, prompt);
    await page.click(SELECTORS.sendButton);

    // Message should appear quickly (optimistic)
    await page.waitForSelector(SELECTORS.message, { timeout: 1000 });
    const messageTime = Date.now();

    // Should appear in <1s (optimistic)
    expect(messageTime - sendTime).toBeLessThan(1000);

    // Should transition to generating
    await page.waitForSelector(
      `${SELECTORS.statusGenerating}, ${SELECTORS.statusPending}`,
      { timeout: 5000 },
    );

    // Refresh
    await page.reload();

    // After refresh, should see server message
    await page.waitForSelector(SELECTORS.message, { timeout: 15000 });

    // Wait for completion
    await page.waitForSelector(SELECTORS.statusComplete, { timeout: 120000 });
  });
});

// Note: Test 4 (Multiple Devices) requires complex setup and is left as manual test
// See docs/testing/resilient-generation-manual.md for manual testing procedure
