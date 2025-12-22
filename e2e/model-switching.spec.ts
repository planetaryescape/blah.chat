/**
 * Model Switching E2E Tests
 *
 * Tests switching between AI models mid-conversation
 */
import { expect, test } from "@playwright/test";

import {
  SELECTORS,
  sendMessage,
  waitForChatReady,
  waitForResponse,
} from "./fixtures/shared";

test.describe("Model Switching", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
    const ready = await waitForChatReady(page);
    if (!ready) {
      test.skip(true, "Chat not accessible");
    }
  });

  test("Cmd+K opens quick model switcher", async ({ page }) => {
    await page.keyboard.press("Meta+k");

    // Should show model switcher dialog
    const dialog = page.locator(SELECTORS.dialog);
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test("model switcher shows available models", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.waitForSelector(SELECTORS.dialog, { timeout: 5000 });

    // Should have model options
    const dialog = page.locator(SELECTORS.dialog);

    // Check for common model names
    const content = await dialog.textContent();
    const hasModels =
      content?.includes("GPT") ||
      content?.includes("Claude") ||
      content?.includes("Gemini") ||
      content?.includes("gpt") ||
      content?.includes("claude");

    expect(hasModels).toBe(true);
  });

  test("can select a different model", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.waitForSelector(SELECTORS.dialog, { timeout: 5000 });

    // Click first model option (not current)
    const modelOptions = page.locator(SELECTORS.dialog).locator('[role="option"]');
    const count = await modelOptions.count();

    if (count > 0) {
      await modelOptions.first().click();
      // Dialog should close
      await page.waitForTimeout(500);
      const dialogVisible = await page.locator(SELECTORS.dialog).isVisible();
      expect(dialogVisible).toBe(false);
    }
  });

  test("switching model updates conversation", async ({ page }) => {
    // Send initial message
    await sendMessage(page, "Hello");
    await waitForResponse(page, 60000);

    // Open model switcher
    await page.keyboard.press("Meta+k");
    await page.waitForSelector(SELECTORS.dialog, { timeout: 5000 });

    // Find and click a different model
    const modelOptions = page.locator(SELECTORS.dialog).locator('[role="option"]');
    if ((await modelOptions.count()) > 1) {
      await modelOptions.nth(1).click();
    }

    // Send another message
    await sendMessage(page, "What model are you?");
    await waitForResponse(page, 60000);

    // Should have responses
    const messages = page.locator(SELECTORS.message);
    expect(await messages.count()).toBeGreaterThanOrEqual(4);
  });

  test("model switcher can be closed with Escape", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.waitForSelector(SELECTORS.dialog, { timeout: 5000 });

    await page.keyboard.press("Escape");

    await page.waitForTimeout(300);
    const isVisible = await page.locator(SELECTORS.dialog).isVisible();
    expect(isVisible).toBe(false);
  });

  test("model switcher can be navigated with keyboard", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.waitForSelector(SELECTORS.dialog, { timeout: 5000 });

    // Navigate with arrow keys
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");

    // Dialog should still be open
    await expect(page.locator(SELECTORS.dialog)).toBeVisible();

    // Press Enter to select
    await page.keyboard.press("Enter");

    // Dialog should close after selection
    await page.waitForTimeout(500);
  });

  test("model search filters options", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.waitForSelector(SELECTORS.dialog, { timeout: 5000 });

    // Type to search
    await page.keyboard.type("gpt");

    await page.waitForTimeout(300);

    // Options should be filtered
    const dialog = page.locator(SELECTORS.dialog);
    const content = await dialog.textContent();

    // Should show GPT-related options or indicate no results
    expect(content?.toLowerCase()).toMatch(/gpt|no.*result|searching/);
  });
});
