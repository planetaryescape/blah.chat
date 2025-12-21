/**
 * Chat Flow E2E Tests
 *
 * Tests message sending, responses, and conversation flow
 */
import { expect, test } from "@playwright/test";

import {
  getLastMessageContent,
  SELECTORS,
  sendMessage,
  waitForChatReady,
  waitForResponse,
} from "./fixtures/shared";

test.describe("Chat Message Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
    const ready = await waitForChatReady(page);
    if (!ready) {
      test.skip(true, "Chat not accessible");
    }
  });

  test("message appears immediately (optimistic UI)", async ({ page }) => {
    const startTime = Date.now();

    await page.fill(SELECTORS.chatInput, "Quick test message");
    await page.click(SELECTORS.sendButton);

    // Message should appear within 1 second (optimistic)
    await page.waitForSelector(SELECTORS.message, { timeout: 1000 });
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(1000);
  });

  test("assistant message shows generating state", async ({ page }) => {
    await sendMessage(page, "Explain what AI is in one paragraph");

    // Should show generating state
    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 15000 });

    // Generating message should be visible
    const generating = page.locator(SELECTORS.statusGenerating);
    await expect(generating).toBeVisible();
  });

  test("streaming content updates during generation", async ({ page }) => {
    await sendMessage(page, "Write a 100-word paragraph about programming");

    await page.waitForSelector(SELECTORS.statusGenerating, { timeout: 15000 });

    // Capture initial content
    const generatingMessage = page.locator(SELECTORS.statusGenerating);
    const initialContent = await generatingMessage
      .locator(SELECTORS.messageContent)
      .textContent();

    // Wait a bit for more content
    await page.waitForTimeout(2000);

    // Content should have grown
    const laterContent = await generatingMessage
      .locator(SELECTORS.messageContent)
      .textContent();

    expect(laterContent!.length).toBeGreaterThan(initialContent!.length);
  });

  test("complete message shows complete status", async ({ page }) => {
    await sendMessage(page, "Say hello");

    await waitForResponse(page, 60000);

    const completeMessage = page.locator(SELECTORS.statusComplete).last();
    await expect(completeMessage).toBeVisible();
  });

  test("can send multiple messages in sequence", async ({ page }) => {
    await sendMessage(page, "First message");
    await waitForResponse(page, 60000);

    await sendMessage(page, "Second message");
    await waitForResponse(page, 60000);

    const messageCount = await page.locator(SELECTORS.message).count();
    // At least 4 messages: 2 user + 2 assistant
    expect(messageCount).toBeGreaterThanOrEqual(4);
  });

  test("assistant response is contextual", async ({ page }) => {
    await sendMessage(page, "My name is TestUser");
    await waitForResponse(page, 60000);

    await sendMessage(page, "What is my name?");
    await waitForResponse(page, 60000);

    const lastContent = await getLastMessageContent(page);
    expect(lastContent?.toLowerCase()).toContain("testuser");
  });

  test("long messages render correctly", async ({ page }) => {
    const longMessage = "Lorem ipsum ".repeat(50);
    await sendMessage(page, longMessage);

    // User message should contain the text
    const userMessage = page.locator(SELECTORS.message).first();
    const content = await userMessage
      .locator(SELECTORS.messageContent)
      .textContent();

    expect(content).toContain("Lorem ipsum");
  });

  test("markdown in responses renders correctly", async ({ page }) => {
    await sendMessage(
      page,
      "Give me a bullet list with exactly 3 items about coding",
    );
    await waitForResponse(page, 60000);

    // Response should contain list elements
    const assistantMessage = page.locator(SELECTORS.statusComplete).last();
    const html = await assistantMessage.innerHTML();

    // Should have rendered list items
    expect(html).toMatch(/<li>|<ul>|•|-/);
  });

  test("code blocks in responses render correctly", async ({ page }) => {
    await sendMessage(
      page,
      'Write a JavaScript function that returns "hello"',
    );
    await waitForResponse(page, 60000);

    const assistantMessage = page.locator(SELECTORS.statusComplete).last();
    const html = await assistantMessage.innerHTML();

    // Should have code block
    expect(html).toMatch(/<code|<pre/);
  });
});

test.describe("Keyboard Shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
    const ready = await waitForChatReady(page);
    if (!ready) {
      test.skip(true, "Chat not accessible");
    }
  });

  test("Cmd+Enter sends message", async ({ page }) => {
    await page.fill(SELECTORS.chatInput, "Test keyboard send");
    await page.keyboard.press("Meta+Enter");

    // Message should appear
    await page.waitForSelector(SELECTORS.message, { timeout: 5000 });
  });

  test("Cmd+K opens quick model switcher", async ({ page }) => {
    await page.keyboard.press("Meta+k");

    // Model switcher dialog should open
    await page.waitForSelector(SELECTORS.dialog, { timeout: 5000 });
  });

  test("Escape closes dialogs", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.waitForSelector(SELECTORS.dialog, { timeout: 5000 });

    await page.keyboard.press("Escape");

    // Dialog should be closed
    await page.waitForTimeout(500);
    const dialogVisible = await page.locator(SELECTORS.dialog).isVisible();
    expect(dialogVisible).toBe(false);
  });
});
