/**
 * Required smoke gate.
 *
 * Auth-free probe against the deployed environment named by
 * SMOKE_BASE_URL. Verifies the app is reachable and the sign-in page
 * renders without a 5xx — catches the catastrophic-outage class of
 * regressions on every PR without needing a test user or burning LLM
 * dollars.
 *
 * Component-level dependency readiness is reported as diagnostic output
 * only. This required PR gate stays liveness-only so unrelated Redis/R2
 * incidents do not block code review.
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

test("smoke: /api/v1/health route is reachable", async ({ request }) => {
  const baseUrl = requireSmokeBaseUrl();

  const response = await request.get(`${baseUrl}/api/v1/health`);
  // 200 = all components healthy; 503 = degraded (at least one component
  // failing); anything else means the route itself is broken. We want
  // the gate to catch only catastrophic outage — the per-component
  // assertions below are skipped on 503 with the legacy shape because
  // older deployments fail-fast and don't report per-component detail.
  expect(
    [200, 503],
    `health route returned ${response.status()} — route may be broken`,
  ).toContain(response.status());

  type ComponentStatus = { status: string; message?: string };
  const body = (await response.json()) as {
    data?: {
      persistence?: {
        database?: ComponentStatus;
        redis?: ComponentStatus;
        r2?: ComponentStatus;
        trigger?: ComponentStatus;
      };
    };
    error?: unknown;
  };

  // New endpoint shape: data.persistence.<component>.status.
  // Old endpoint shape: error string, no persistence detail.
  // Keep this gate liveness-only; dependency readiness belongs in alerting.
  const persistence = body.data?.persistence;
  if (persistence?.database && typeof persistence.database === "object") {
    const degraded = Object.entries(persistence)
      .filter(([, component]) => component?.status !== "ok")
      .map(
        ([name, component]) => `${name}: ${component?.message ?? "no message"}`,
      );

    if (degraded.length > 0) {
      console.warn(`health endpoint degraded: ${degraded.join("; ")}`);
    }
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
