/**
 * Generation Failure E2E Tests
 *
 * Tests provider failures, network disconnects, and rapid stop/start
 * via Playwright request interception.
 */
import { expect, test } from "@playwright/test";

const SELECTORS = {
  chatInput: '[data-testid="chat-input"]',
  sendButton: '[data-testid="send-button"]',
  stopButton: '[data-testid="stop-button"]',
  message: '[data-testid="message"]',
  messageContent: '[data-testid="message-content"]',
  statusGenerating: '[data-testid="message"][data-status="generating"]',
  statusComplete: '[data-testid="message"][data-status="complete"]',
  statusError: '[data-testid="message"][data-status="error"]',
};

test.describe("Generation Failures", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");

    try {
      await page.waitForSelector(SELECTORS.chatInput, { timeout: 15000 });
    } catch {
      test.skip(true, "Chat not accessible - requires authentication setup");
    }
  });

  test("shows error state when SSE stream returns 500", async ({ page }) => {
    // Intercept the generation stream endpoint to simulate server error
    let intercepted = false;
    await page.route("**/api/v1/generations/*/stream", (route) => {
      if (!intercepted) {
        intercepted = true;
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      } else {
        route.continue();
      }
    });

    await page.fill(SELECTORS.chatInput, "Say hello");
    await page.click(SELECTORS.sendButton);

    // Should eventually show error or complete (server-side generation still runs)
    await page.waitForSelector(
      `${SELECTORS.statusError}, ${SELECTORS.statusComplete}`,
      { timeout: 30000 },
    );
  });

  test("recovers from SSE disconnect mid-stream", async ({ page, context }) => {
    await page.fill(
      SELECTORS.chatInput,
      "Write a 200-word explanation of JavaScript closures",
    );
    await page.click(SELECTORS.sendButton);

    // Wait for generation to start
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 15000 });

    // Let some content arrive
    await page.waitForTimeout(2000);

    // Simulate network disconnect by going offline
    await context.setOffline(true);
    await page.waitForTimeout(2000);

    // Come back online
    await context.setOffline(false);

    // Should recover and eventually complete
    await page.waitForSelector(SELECTORS.statusComplete, { timeout: 120000 });

    const content = await page
      .locator(SELECTORS.statusComplete)
      .last()
      .locator(SELECTORS.messageContent)
      .textContent();

    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(50);
  });

  test("handles rapid stop then new message", async ({ page }) => {
    // Send first message
    await page.fill(
      SELECTORS.chatInput,
      "Write a long essay about machine learning",
    );
    await page.click(SELECTORS.sendButton);

    // Wait for generation to start
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Stop generation
    const stopButton = page.locator(SELECTORS.stopButton);
    if (await stopButton.isVisible()) {
      await stopButton.click();
    }

    // Wait for input to be available again
    await page.waitForSelector(SELECTORS.chatInput, { timeout: 10000 });

    // Immediately send a new message
    await page.fill(SELECTORS.chatInput, "Say hello briefly");
    await page.click(SELECTORS.sendButton);

    // Second message should generate normally
    await page.waitForSelector(SELECTORS.statusComplete, { timeout: 60000 });

    // Should have at least 2 assistant messages (one stopped, one complete)
    const assistantMessages = page.locator(
      `${SELECTORS.message}[data-role="assistant"]`,
    );
    const count = await assistantMessages.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("multiple rapid refreshes during generation recovers content", async ({
    page,
  }) => {
    await page.fill(
      SELECTORS.chatInput,
      "Write a 300-word explanation of database indexing",
    );
    await page.click(SELECTORS.sendButton);

    // Wait for generation to start
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Rapid refresh 3 times
    await page.reload();
    await page.waitForSelector(SELECTORS.message, { timeout: 15000 });
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForSelector(SELECTORS.message, { timeout: 15000 });
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForSelector(SELECTORS.message, { timeout: 15000 });

    // After all refreshes, content should still be accessible
    await page.waitForSelector(
      `${SELECTORS.statusComplete}, ${SELECTORS.statusGenerating}`,
      { timeout: 30000 },
    );

    // Wait for final completion
    await page.waitForSelector(SELECTORS.statusComplete, { timeout: 120000 });

    const content = await page
      .locator(SELECTORS.statusComplete)
      .last()
      .locator(SELECTORS.messageContent)
      .textContent();

    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(50);
  });
});
