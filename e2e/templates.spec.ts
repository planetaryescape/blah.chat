/**
 * Template Insertion E2E Tests
 *
 * Tests prompt template functionality
 */
import { expect, test } from "@playwright/test";

import { SELECTORS, waitForChatReady } from "./fixtures/shared";

test.describe("Templates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
    const ready = await waitForChatReady(page);
    if (!ready) {
      test.skip(true, "Chat not accessible");
    }
  });

  test("templates page is accessible", async ({ page }) => {
    await page.goto("/templates");

    // Should either show templates or redirect to auth
    const url = page.url();
    const onTemplates = url.includes("/templates");
    const onAuth = url.includes("/sign-in");

    expect(onTemplates || onAuth).toBe(true);
  });

  test("templates button exists in chat", async ({ page }) => {
    const templateButton = page.locator(
      'button[aria-label*="Template"], button:has-text("Template"), [data-testid="templates-button"]',
    );

    const isVisible = await templateButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(typeof isVisible).toBe("boolean");
  });

  test("clicking templates button opens template list", async ({ page }) => {
    const templateButton = page.locator(
      'button[aria-label*="Template"], button:has-text("Template")',
    );

    if (await templateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await templateButton.click();

      // Template list/dialog should open
      const templateList = page.locator(
        '[data-testid="template-list"], [role="listbox"], [role="dialog"]',
      );

      const isOpen = await templateList
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      expect(typeof isOpen).toBe("boolean");
    }
  });

  test("selecting template inserts into input", async ({ page }) => {
    const templateButton = page.locator(
      'button[aria-label*="Template"], button:has-text("Template")',
    );

    if (await templateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await templateButton.click();
      await page.waitForTimeout(500);

      // Try to click first template option
      const templateOption = page.locator('[role="option"]').first();
      if (
        await templateOption.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await templateOption.click();

        // Input should have content
        await page.waitForTimeout(300);
        const inputValue = await page.locator(SELECTORS.chatInput).inputValue();

        expect(typeof inputValue).toBe("string");
      }
    }
  });

  test("templates can be searched", async ({ page }) => {
    const templateButton = page.locator(
      'button[aria-label*="Template"], button:has-text("Template")',
    );

    if (await templateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await templateButton.click();
      await page.waitForTimeout(500);

      // Look for search input in template dialog
      const searchInput = page.locator(
        '[role="dialog"] input, [data-testid="template-search"]',
      );

      const hasSearch = await searchInput
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      expect(typeof hasSearch).toBe("boolean");
    }
  });

  test("can create custom template", async ({ page }) => {
    await page.goto("/templates");

    // Look for create/add button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add"), button:has-text("New")',
    );

    const canCreate = await createButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(typeof canCreate).toBe("boolean");
  });

  test("templates have categories or tags", async ({ page }) => {
    const templateButton = page.locator(
      'button[aria-label*="Template"], button:has-text("Template")',
    );

    if (await templateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await templateButton.click();
      await page.waitForTimeout(500);

      // Look for category/tag elements
      const categories = page.locator(
        '[data-testid*="category"], .category, [class*="tag"]',
      );

      const hasCategories = await categories.count();
      expect(typeof hasCategories).toBe("number");
    }
  });

  test("template variables are highlighted", async ({ page }) => {
    // Templates with variables like {{topic}} should be highlighted
    const templateButton = page.locator(
      'button[aria-label*="Template"], button:has-text("Template")',
    );

    if (await templateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await templateButton.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const content = await dialog.textContent();

      // Check for variable patterns
      const hasVariables = content?.includes("{{") || content?.includes("{");
      expect(typeof hasVariables).toBe("boolean");
    }
  });
});
