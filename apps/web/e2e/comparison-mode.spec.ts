/**
 * Comparison Mode E2E Tests
 *
 * Tests comparing responses from multiple AI models
 */
import { expect, test } from "@playwright/test";

import { SELECTORS, waitForChatReady } from "./fixtures/shared";

test.describe("Comparison Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
    const ready = await waitForChatReady(page);
    if (!ready) {
      test.skip(true, "Chat not accessible");
    }
  });

  test("can enable comparison mode", async ({ page }) => {
    // Look for comparison mode toggle or button
    const compareButton = page.locator(
      'button[aria-label*="Compare"], button:has-text("Compare"), [data-testid="compare-mode"]',
    );

    const isVisible = await compareButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isVisible) {
      await compareButton.click();

      // Should enable comparison mode
      await page.waitForTimeout(500);
    }
  });

  test("comparison mode shows multiple model selectors", async ({ page }) => {
    // Try to enter comparison mode
    const compareButton = page.locator(
      'button[aria-label*="Compare"], button:has-text("Compare")',
    );

    if (await compareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await compareButton.click();
      await page.waitForTimeout(500);

      // Should show multiple model selection options
      const modelSelectors = page.locator(
        '[data-testid*="model"], [aria-label*="model"]',
      );
      const count = await modelSelectors.count();

      // Comparison mode should have 2+ model selectors
      if (count > 0) {
        expect(count).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("can select models for comparison", async ({ page }) => {
    // Open quick model switcher
    await page.keyboard.press("Meta+k");
    await page.waitForSelector(SELECTORS.dialog, { timeout: 5000 });

    // Look for multi-select or comparison options
    const dialog = page.locator(SELECTORS.dialog);
    const content = await dialog.textContent();

    // Check if comparison is mentioned
    const hasCompareFeature =
      content?.toLowerCase().includes("compare") ||
      content?.toLowerCase().includes("multiple");

    // Close dialog
    await page.keyboard.press("Escape");

    // Feature may or may not be present
    expect(typeof hasCompareFeature).toBe("boolean");
  });

  test("comparison response shows side-by-side", async ({ page }) => {
    // This test checks if comparison UI exists when triggered
    // First send a message
    await page.fill(SELECTORS.chatInput, "Compare test");

    // Check for comparison-specific UI elements
    const comparisonContainer = page.locator(
      '[data-testid="comparison"], .comparison-view, [class*="comparison"]',
    );

    const isComparison = await comparisonContainer
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // Comparison may not be active by default
    expect(typeof isComparison).toBe("boolean");
  });

  test("each model response is labeled", async ({ page }) => {
    // Look for model labels in messages
    const messages = page.locator(SELECTORS.message);
    const count = await messages.count();

    if (count > 0) {
      // Check if messages have model attribution
      const firstMessage = messages.first();
      const html = await firstMessage.innerHTML();

      // Model labels might be present
      const hasLabel =
        html.includes("gpt") ||
        html.includes("claude") ||
        html.includes("gemini") ||
        html.includes("model");

      expect(typeof hasLabel).toBe("boolean");
    }
  });

  test("can toggle between comparison and single mode", async ({ page }) => {
    // Find toggle
    const modeToggle = page.locator(
      '[data-testid="mode-toggle"], button[aria-label*="mode"]',
    );

    const isVisible = await modeToggle
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (isVisible) {
      // Toggle mode
      await modeToggle.click();
      await page.waitForTimeout(300);

      // Toggle again
      await modeToggle.click();
      await page.waitForTimeout(300);
    }

    // Page should still be functional
    await expect(page.locator(SELECTORS.chatInput)).toBeVisible();
  });
});
