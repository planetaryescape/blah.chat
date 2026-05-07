/**
 * Required smoke gate.
 *
 * Auth-free probe against the deployed environment named by
 * SMOKE_BASE_URL. Verifies the health endpoint reports every persistence
 * component as "ok" — catches DB / Redis / R2 / Trigger outages on every
 * PR without needing a test user or burning LLM dollars.
 *
 * Hard-fails when SMOKE_BASE_URL is missing so the gate cannot silently
 * skip in CI. Full chat-loop verification (send → refresh → persistence)
 * lives in the manual section of the PR test plan and is run once on a
 * deploy preview before merge.
 */
import { expect, test } from "@playwright/test";

function requireSmokeBaseUrl(): string {
  const baseUrl = process.env.SMOKE_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "smoke gate is missing required env: SMOKE_BASE_URL. " +
        "Configure as a CI secret — do NOT make this test skip.",
    );
  }
  return baseUrl;
}

test("smoke: /api/v1/health reports all components ok", async ({ request }) => {
  const baseUrl = requireSmokeBaseUrl();

  const response = await request.get(`${baseUrl}/api/v1/health`);
  expect(response.status()).toBe(200);

  const body = (await response.json()) as {
    data?: {
      persistence?: {
        database?: string;
        redis?: string;
        r2?: string;
        trigger?: string;
      };
    };
  };

  expect(body.data?.persistence?.database).toBe("ok");
  expect(body.data?.persistence?.redis).toBe("ok");
  expect(body.data?.persistence?.r2).toBe("ok");
  // trigger is optional in some environments — only assert when reported
  if (body.data?.persistence?.trigger !== undefined) {
    expect(body.data.persistence.trigger).toBe("ok");
  }
});

test("smoke: sign-in page renders without server error", async ({ page }) => {
  const baseUrl = requireSmokeBaseUrl();

  const response = await page.goto(`${baseUrl}/sign-in`, {
    waitUntil: "domcontentloaded",
  });

  expect(response?.status() ?? 0).toBeLessThan(500);
  // Clerk's component takes a moment to mount — wait for either its container
  // or the body containing typical sign-in copy.
  await expect(page.locator("body")).toContainText(/sign in|log in/i, {
    timeout: 15_000,
  });
});
