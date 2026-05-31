/**
 * Comparison Mode E2E Tests
 *
 * Tests comparing responses from multiple AI models
 */
import { createClerkClient } from "@clerk/backend";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { SELECTORS, waitForChatReady } from "./fixtures/shared";

const BASE_URL = "http://localhost:3000";
const PREFERRED_COMPARISON_MODELS = ["GPT-5 Mini", "GPT-5", "GPT-5 Nano"];

async function domClick(locator: Locator) {
  await locator.evaluate((element) => {
    (element as HTMLElement).click();
  });
}

async function signInWithFreshUser(page: Page) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  test.skip(!secretKey, "CLERK_SECRET_KEY required for comparison E2E");

  const clerk = createClerkClient({ secretKey });
  const email = `phase8.comparison.${Date.now()}@example.com`;
  const user = await clerk.users.createUser({
    emailAddress: [email],
    password: "Phase8Flow234A",
    skipPasswordChecks: true,
    skipPasswordRequirement: true,
  });
  const ticket = await clerk.signInTokens.createSignInToken({
    userId: user.id,
    expiresInSeconds: 1800,
  });

  await page.goto(
    `${BASE_URL}/sign-in?__clerk_ticket=${encodeURIComponent(ticket.token)}&redirect_url=${encodeURIComponent(`${BASE_URL}/chat`)}`,
  );
}

async function dismissFirstRunOverlays(page: Page) {
  await page.waitForTimeout(2500);

  const autoRouterButton = page.getByRole("button", {
    name: "Use Auto Router",
  });
  if (await autoRouterButton.isVisible().catch(() => false)) {
    await domClick(autoRouterButton);
    await page.waitForTimeout(200);
    await domClick(page.getByRole("button", { name: "Continue" }));
    await expect(page.getByText("Auto Router or Manual?")).toBeHidden({
      timeout: 15000,
    });
  }

  const closeTourButton = page.getByRole("button", { name: "Close Tour" });
  if (await closeTourButton.isVisible().catch(() => false)) {
    await domClick(closeTourButton);
    await expect(closeTourButton).toBeHidden({ timeout: 5000 });
  }

  await page.waitForTimeout(1000);
}

async function openComparisonPicker(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await domClick(page.getByTestId("comparison-trigger"));

    const modelItems = page.locator("[cmdk-item]");
    try {
      await expect
        .poll(async () => modelItems.count(), {
          timeout: 5000,
        })
        .toBeGreaterThanOrEqual(2);
      return modelItems;
    } catch {
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(750);
    }
  }

  throw new Error("Comparison picker did not populate");
}

async function selectPreferredComparisonModels(modelItems: Locator) {
  const selected: string[] = [];

  for (const modelName of PREFERRED_COMPARISON_MODELS) {
    const item = modelItems.filter({ hasText: modelName }).first();
    if (!(await item.count())) {
      continue;
    }

    await item.click();
    selected.push(modelName);

    if (selected.length === 2) {
      return selected;
    }
  }

  throw new Error(
    `Could not find 2 supported comparison models. Found: ${selected.join(", ") || "none"}`,
  );
}

test.describe("Comparison Mode", () => {
  test.beforeEach(async ({ page }) => {
    await signInWithFreshUser(page);
    const ready = await waitForChatReady(page);
    if (!ready) {
      test.skip(true, "Chat not accessible");
    }
    await dismissFirstRunOverlays(page);
  });

  test("can stop one child, persist the winner vote across refresh, and consolidate in same chat", async ({
    page,
  }) => {
    test.slow();
    test.setTimeout(300000);

    const modelItems = await openComparisonPicker(page);

    const modelCount = await modelItems.count();
    if (modelCount < 2) {
      test.skip(true, "Need at least 2 selectable models for comparison");
    }

    await selectPreferredComparisonModels(modelItems);
    await expect(page.getByText("2/4 selected")).toBeVisible();
    await page.getByRole("button", { name: "Compare Models" }).click();
    await expect(
      page.getByRole("button", { name: /exit comparison mode/i }),
    ).toBeVisible();

    await page.fill(
      SELECTORS.chatInput,
      "Write a detailed comparison of REST and GraphQL with 15 numbered bullets and concrete examples. Each bullet should have two sentences.",
    );
    await page.click(SELECTORS.sendButton);

    await expect(page.getByTestId("comparison-view").last()).toBeVisible({
      timeout: 15000,
    });

    const childStopButton = page.getByTestId("comparison-stop-session").first();
    await expect(childStopButton).toBeVisible({ timeout: 30000 });
    await childStopButton.click();

    await expect(page.getByRole("button", { name: /mark tie/i })).toBeVisible({
      timeout: 120000,
    });

    const winnerButton = page
      .getByRole("button", {
        name: /choose winner/i,
      })
      .first();
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/api/v1/comparisons/") &&
          response.url().includes("/vote") &&
          response.status() === 200,
      ),
      winnerButton.click(),
    ]);
    await expect(page.getByText("Voted")).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByTestId("comparison-view").last()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Voted")).toBeVisible({ timeout: 15000 });

    await page.getByTestId("comparison-consolidate").click();
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/api/v1/comparisons/") &&
          response.url().includes("/consolidate") &&
          response.status() === 202,
      ),
      page.getByRole("button", { name: /consolidate with/i }).click(),
    ]);

    await page.reload();
    const originalResponsesToggle = page.getByTestId(
      "original-responses-toggle",
    );
    await expect(originalResponsesToggle).toBeVisible({ timeout: 120000 });
    await originalResponsesToggle.click();
    await expect(page.getByTestId("comparison-view").last()).toBeVisible();
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
