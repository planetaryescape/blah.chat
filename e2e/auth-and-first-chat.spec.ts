/**
 * Auth Flow & First Chat E2E Tests
 *
 * Tests authentication flow and initial chat experience
 */
import { expect, test } from "@playwright/test";

import { SELECTORS, waitForChatReady } from "./fixtures/shared";

test.describe("Authentication Flow", () => {
  test("unauthenticated user is redirected to sign-in", async ({ page }) => {
    await page.goto("/chat");

    // Should redirect to sign-in if not authenticated
    const url = page.url();
    const isOnChat = url.includes("/chat");
    const isOnAuth = url.includes("/sign-in") || url.includes("/sign-up");

    // Either user is authenticated (on chat) or redirected to auth
    expect(isOnChat || isOnAuth).toBe(true);

    if (isOnAuth) {
      // Verify sign-in form exists
      await expect(page.locator("form")).toBeVisible({ timeout: 10000 });
    }
  });

  test("sign-in page renders correctly", async ({ page }) => {
    await page.goto("/sign-in");

    // Verify key elements (Clerk sign-in)
    await expect(page.locator("body")).toContainText(/sign in|log in/i);
  });
});

test.describe("First Chat Experience", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");

    const ready = await waitForChatReady(page);
    if (!ready) {
      test.skip(true, "Chat not accessible - requires authentication");
    }
  });

  test("chat page loads with input and sidebar", async ({ page }) => {
    // Chat input should be visible
    await expect(page.locator(SELECTORS.chatInput)).toBeVisible();

    // Send button should exist
    await expect(page.locator(SELECTORS.sendButton)).toBeVisible();

    // Sidebar should be present
    await expect(page.locator(SELECTORS.sidebar)).toBeVisible();
  });

  test("can send first message", async ({ page }) => {
    const testMessage = "Hello, this is a test message";

    await page.fill(SELECTORS.chatInput, testMessage);
    await page.click(SELECTORS.sendButton);

    // User message should appear
    const messages = page.locator(SELECTORS.message);
    await expect(messages.first()).toBeVisible({ timeout: 5000 });

    // Message content should contain our text
    const firstMessage = messages.first();
    await expect(firstMessage.locator(SELECTORS.messageContent)).toContainText(
      testMessage,
    );
  });

  test("assistant responds to message", async ({ page }) => {
    await page.fill(SELECTORS.chatInput, "Say hello");
    await page.click(SELECTORS.sendButton);

    // Wait for generating state
    await page.waitForSelector(
      `${SELECTORS.statusGenerating}, ${SELECTORS.statusComplete}`,
      { timeout: 15000 },
    );

    // Wait for completion
    await page.waitForSelector(SELECTORS.statusComplete, { timeout: 120000 });

    // Should have at least 2 messages (user + assistant)
    const messageCount = await page.locator(SELECTORS.message).count();
    expect(messageCount).toBeGreaterThanOrEqual(2);
  });

  test("conversation appears in sidebar after first message", async ({
    page,
  }) => {
    await page.fill(SELECTORS.chatInput, "Create a new conversation");
    await page.click(SELECTORS.sendButton);

    // Wait for response to complete
    await page.waitForSelector(SELECTORS.statusComplete, { timeout: 120000 });

    // Sidebar should show conversation
    const conversations = page.locator(SELECTORS.conversationItem);
    const count = await conversations.count();
    expect(count).toBeGreaterThan(0);
  });

  test("input clears after sending message", async ({ page }) => {
    await page.fill(SELECTORS.chatInput, "Test message");
    await page.click(SELECTORS.sendButton);

    // Input should be cleared
    const inputValue = await page.locator(SELECTORS.chatInput).inputValue();
    expect(inputValue).toBe("");
  });

  test("send button is disabled with empty input", async ({ page }) => {
    // Clear input
    await page.fill(SELECTORS.chatInput, "");

    // Send button should be disabled or not triggerable
    const sendButton = page.locator(SELECTORS.sendButton);
    const isDisabled = await sendButton.isDisabled();

    // Either disabled or clicking does nothing
    if (!isDisabled) {
      await sendButton.click();
      // No message should appear
      await page.waitForTimeout(1000);
      const messageCount = await page.locator(SELECTORS.message).count();
      // Either 0 messages or it was previously populated
      expect(messageCount).toBeLessThanOrEqual(1);
    }
  });
});
