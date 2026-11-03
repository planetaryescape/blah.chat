import { expect, test } from "@playwright/test";
import { DEFAULT_MODEL_ID } from "../../../packages/ai/src/operational-models";

function baseUrl() {
  const url = process.env.SMOKE_BASE_URL;
  if (!url) throw new Error("SMOKE_BASE_URL is required");
  return url;
}

test("production is connected to a seeded Convex deployment", async ({
  request,
}) => {
  const response = await request.get(`${baseUrl()}/api/v1/health`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data.backend).toBe("convex");
  expect(body.data.persistence.convex.status).toBe("ok");
});

test("sign-in renders", async ({ page }) => {
  const response = await page.goto(`${baseUrl()}/sign-in`);
  expect(response?.status()).toBeLessThan(500);
  await expect(page.locator("body")).toContainText(/sign in|log in/i);
});

test.describe("authenticated smoke", () => {
  const state = process.env.SMOKE_AUTH_STORAGE_STATE_PATH;
  test.skip(
    !state,
    "SMOKE_AUTH_STORAGE_STATE_PATH is required for authenticated smoke",
  );
  if (state) test.use({ storageState: state });

  test("conversation create/read/delete persists through Convex", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`${baseUrl()}/settings`);
    await expect(
      page.getByRole("button", { name: "Open user menu", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    const api = page.context().request;
    const title = `convex-smoke-${Date.now()}`;
    let id: string | undefined;
    try {
      const response = await api.post(`${baseUrl()}/api/v1/conversations`, {
        data: { title, model: DEFAULT_MODEL_ID },
      });
      expect(response.status()).toBe(201);
      expect(response.headers()["content-type"]).toMatch(/application\/json/i);
      const created = await response.json();
      id = created.data?._id ?? created.data?.id;
      expect(id).toBeTruthy();
      const fetched = await api.get(`${baseUrl()}/api/v1/conversations/${id}`);
      expect(fetched.status()).toBe(200);
      expect(fetched.headers()["content-type"]).toMatch(/application\/json/i);
      expect((await fetched.json()).data.title).toBe(title);
    } finally {
      if (id) {
        const response = await api.delete(
          `${baseUrl()}/api/v1/conversations/${id}`,
        );
        expect.soft(response.status()).toBe(200);
        expect
          .soft(response.headers()["content-type"])
          .toMatch(/application\/json/i);
      }
    }
  });
});
