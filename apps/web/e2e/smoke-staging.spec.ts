/**
 * Required smoke gate.
 *
 * Probe against the deployed environment named by SMOKE_BASE_URL.
 * The liveness checks verify health + sign-in. The authenticated check uses
 * a low-privilege smoke user storage state and exercises conversation
 * create/read/delete without burning LLM dollars.
 *
 * Component-level dependency readiness is reported as diagnostic output
 * only. This required PR gate stays liveness-only so unrelated Redis/R2
 * incidents do not block code review.
 *
 * Hard-fails when SMOKE_BASE_URL is missing. Authenticated checks are skipped
 * when SMOKE_AUTH_STORAGE_STATE_PATH is absent so PR CI can still run the
 * liveness probes when environment secrets are unavailable.
 */
import { DEFAULT_MODEL_ID } from "@blah-chat/ai/operational-models";
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

test.describe("authenticated smoke", () => {
  const smokeAuthStorageStatePath = process.env.SMOKE_AUTH_STORAGE_STATE_PATH;

  test.skip(
    !smokeAuthStorageStatePath,
    "authenticated smoke requires SMOKE_AUTH_STORAGE_STATE_PATH",
  );

  if (smokeAuthStorageStatePath) {
    test.use({ storageState: smokeAuthStorageStatePath });
  }

  test("smoke: authenticated user can create, fetch, and delete a conversation", async ({
    page,
  }) => {
    const baseUrl = requireSmokeBaseUrl();
    const api = page.context().request;
    const title = `smoke-${Date.now()}`;
    let conversationId: string | undefined;

    try {
      const createResponse = await api.post(`${baseUrl}/api/v1/conversations`, {
        data: {
          title,
          model: DEFAULT_MODEL_ID,
        },
      });
      expect(createResponse.status()).toBe(201);
      const created = (await createResponse.json()) as {
        data?: { _id?: string; id?: string; title?: string };
      };
      conversationId = created.data?._id ?? created.data?.id;
      expect(conversationId).toBeTruthy();

      const fetchResponse = await api.get(
        `${baseUrl}/api/v1/conversations/${conversationId}`,
      );
      expect(fetchResponse.status()).toBe(200);
      const fetched = (await fetchResponse.json()) as {
        data?: { _id?: string; id?: string; title?: string };
      };
      expect(fetched.data?._id ?? fetched.data?.id).toBe(conversationId);
      expect(fetched.data?.title).toBe(title);
    } finally {
      if (conversationId) {
        const deleteResponse = await api.delete(
          `${baseUrl}/api/v1/conversations/${conversationId}`,
        );
        expect([200, 404]).toContain(deleteResponse.status());
      }
    }
  });
});
