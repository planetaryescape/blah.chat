import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the deployed-URL smoke gate.
 *
 * Unlike the full e2e config, this one does NOT start a local dev server.
 * The tests target SMOKE_BASE_URL and require a low-privilege authenticated
 * storage state for the conversation create/read/delete smoke.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /smoke-staging\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? "https://www.blah.chat",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
