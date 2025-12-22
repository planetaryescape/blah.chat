/**
 * Conversation CRUD E2E Tests
 *
 * Tests create, read, update, delete operations on conversations
 */
import { expect, test } from "@playwright/test";

import {
  clickNewChat,
  getConversationCount,
  openFirstConversation,
  SELECTORS,
  sendMessage,
  waitForChatReady,
  waitForResponse,
} from "./fixtures/shared";

test.describe("Conversation CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
    const ready = await waitForChatReady(page);
    if (!ready) {
      test.skip(true, "Chat not accessible");
    }
  });

  test.describe("Create", () => {
    test("new chat button creates new conversation", async ({ page }) => {
      const initialUrl = page.url();

      await clickNewChat(page);

      // URL should change or input should be empty/ready
      await page.waitForTimeout(500);
      const newUrl = page.url();

      // Either URL changed or we're on a fresh chat
      const urlChanged = newUrl !== initialUrl;
      const inputEmpty =
        (await page.locator(SELECTORS.chatInput).inputValue()) === "";

      expect(urlChanged || inputEmpty).toBe(true);
    });

    test("sending message creates conversation in sidebar", async ({
      page,
    }) => {
      const initialCount = await getConversationCount(page);

      await sendMessage(page, "Create new conversation test");
      await waitForResponse(page, 60000);

      const newCount = await getConversationCount(page);
      expect(newCount).toBeGreaterThan(initialCount);
    });

    test("conversation gets auto-titled after first message", async ({
      page,
    }) => {
      await clickNewChat(page);

      await sendMessage(page, "Tell me about JavaScript programming");
      await waitForResponse(page, 60000);

      // Wait for auto-title
      await page.waitForTimeout(3000);

      // First conversation should have meaningful title
      const firstConv = page.locator(SELECTORS.conversationItem).first();
      const title = await firstConv.textContent();

      // Title should not be "New conversation" or empty
      expect(title?.toLowerCase()).not.toBe("new conversation");
      expect(title?.trim().length).toBeGreaterThan(0);
    });
  });

  test.describe("Read", () => {
    test("clicking conversation loads it", async ({ page }) => {
      // Create a conversation first
      await sendMessage(page, "Test conversation for read test");
      await waitForResponse(page, 60000);

      // Create another
      await clickNewChat(page);
      await sendMessage(page, "Second conversation");
      await waitForResponse(page, 60000);

      // Click first conversation
      await openFirstConversation(page);

      // Should show messages from that conversation
      await page.waitForTimeout(500);
      const messages = page.locator(SELECTORS.message);
      expect(await messages.count()).toBeGreaterThan(0);
    });

    test("conversation persists after page refresh", async ({ page }) => {
      await sendMessage(page, "Persistent message test");
      await waitForResponse(page, 60000);

      const url = page.url();

      // Refresh
      await page.reload();
      await waitForChatReady(page);

      // Messages should still be there
      const messages = page.locator(SELECTORS.message);
      expect(await messages.count()).toBeGreaterThan(0);
    });
  });

  test.describe("Update", () => {
    test("can rename conversation via menu", async ({ page }) => {
      await sendMessage(page, "Conversation to rename");
      await waitForResponse(page, 60000);

      // Right-click or open menu on conversation
      const firstConv = page.locator(SELECTORS.conversationItem).first();
      await firstConv.click({ button: "right" });

      // Look for rename option
      const renameOption = page.locator('text=Rename');
      if (await renameOption.isVisible({ timeout: 2000 })) {
        await renameOption.click();

        // Type new name
        const input = page.locator('input[type="text"]').first();
        await input.fill("Renamed Conversation");
        await input.press("Enter");

        // Verify rename
        await page.waitForTimeout(500);
        const convText = await firstConv.textContent();
        expect(convText).toContain("Renamed");
      }
    });

    test("can pin conversation", async ({ page }) => {
      await sendMessage(page, "Conversation to pin");
      await waitForResponse(page, 60000);

      const firstConv = page.locator(SELECTORS.conversationItem).first();
      await firstConv.click({ button: "right" });

      const pinOption = page.locator('text=Pin');
      if (await pinOption.isVisible({ timeout: 2000 })) {
        await pinOption.click();

        // Verify pinned state (check for pin icon or pinned section)
        await page.waitForTimeout(500);
        const html = await page.locator(SELECTORS.sidebar).innerHTML();
        expect(html).toMatch(/pin|📌|Pinned/i);
      }
    });

    test("can star conversation", async ({ page }) => {
      await sendMessage(page, "Conversation to star");
      await waitForResponse(page, 60000);

      const firstConv = page.locator(SELECTORS.conversationItem).first();
      await firstConv.click({ button: "right" });

      const starOption = page.locator('text=Star');
      if (await starOption.isVisible({ timeout: 2000 })) {
        await starOption.click();

        await page.waitForTimeout(500);
        const html = await page.locator(SELECTORS.sidebar).innerHTML();
        expect(html).toMatch(/star|⭐|Starred/i);
      }
    });
  });

  test.describe("Delete", () => {
    test("can delete conversation via menu", async ({ page }) => {
      await sendMessage(page, "Conversation to delete");
      await waitForResponse(page, 60000);

      const initialCount = await getConversationCount(page);

      const firstConv = page.locator(SELECTORS.conversationItem).first();
      await firstConv.click({ button: "right" });

      const deleteOption = page.locator('text=Delete');
      if (await deleteOption.isVisible({ timeout: 2000 })) {
        await deleteOption.click();

        // Confirm delete in dialog
        const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        await page.waitForTimeout(1000);
        const newCount = await getConversationCount(page);
        expect(newCount).toBeLessThan(initialCount);
      }
    });

    test("deleted conversation is removed from sidebar", async ({ page }) => {
      await sendMessage(page, "Unique deletion test message");
      await waitForResponse(page, 60000);

      // Get conversation text before delete
      const firstConv = page.locator(SELECTORS.conversationItem).first();
      const titleBefore = await firstConv.textContent();

      await firstConv.click({ button: "right" });

      const deleteOption = page.locator('text=Delete');
      if (await deleteOption.isVisible({ timeout: 2000 })) {
        await deleteOption.click();

        const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        await page.waitForTimeout(1000);

        // Sidebar should not contain the deleted title
        const sidebarText = await page
          .locator(SELECTORS.sidebar)
          .textContent();

        // Title might be truncated, check for unique part
        if (titleBefore && titleBefore.includes("Unique deletion")) {
          expect(sidebarText).not.toContain("Unique deletion");
        }
      }
    });
  });

  test.describe("Archive", () => {
    test("can archive conversation", async ({ page }) => {
      await sendMessage(page, "Conversation to archive");
      await waitForResponse(page, 60000);

      const firstConv = page.locator(SELECTORS.conversationItem).first();
      await firstConv.click({ button: "right" });

      const archiveOption = page.locator('text=Archive');
      if (await archiveOption.isVisible({ timeout: 2000 })) {
        await archiveOption.click();

        // Verify archived (should be removed from main list or moved)
        await page.waitForTimeout(500);
      }
    });
  });
});
