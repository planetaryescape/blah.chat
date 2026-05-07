/**
 * Staging fixtures for the required staging-smoke E2E job.
 *
 * The smoke spec runs against a real staging deployment (not a local
 * dev server). It hard-fails when STAGING_BASE_URL or CLERK_TESTING_TOKEN
 * is missing so we never silently skip the gate that protects production.
 */
import type { Page } from "@playwright/test";

export interface StagingEnv {
  baseUrl: string;
  clerkTestingToken: string;
}

export function requireStagingEnv(): StagingEnv {
  const baseUrl = process.env.STAGING_BASE_URL;
  const clerkTestingToken = process.env.CLERK_TESTING_TOKEN;

  const missing: string[] = [];
  if (!baseUrl) missing.push("STAGING_BASE_URL");
  if (!clerkTestingToken) missing.push("CLERK_TESTING_TOKEN");
  if (missing.length > 0) {
    throw new Error(
      `staging-smoke is missing required env: ${missing.join(", ")}. ` +
        "Configure these as CI secrets — do NOT make this test skip.",
    );
  }

  return {
    baseUrl: baseUrl as string,
    clerkTestingToken: clerkTestingToken as string,
  };
}

/**
 * Sign in to staging using Clerk's testing token. Clerk supports a
 * dev-mode bearer token that bypasses interactive sign-in flows; the
 * token is generated via the Clerk dashboard and treated as a CI secret.
 *
 * See https://clerk.com/docs/testing/playwright for the upstream guide.
 */
export async function signInWithTestingToken(
  page: Page,
  env: StagingEnv,
): Promise<void> {
  await page.goto(`${env.baseUrl}/sign-in`);
  // Inject the Clerk testing token via the documented query parameter so
  // the Clerk component picks it up before mounting.
  await page.evaluate((token) => {
    window.localStorage.setItem("__clerk_testing_token", token);
  }, env.clerkTestingToken);
  await page.goto(
    `${env.baseUrl}/chat?__clerk_testing_token=${env.clerkTestingToken}`,
  );
  await page.waitForURL(/\/chat/, { timeout: 30_000 });
}

/**
 * Pick the cheapest model from the picker so the smoke run is bounded
 * in cost. The model id is sourced from MODEL_CONFIG so a deprecation
 * surfaces as a test failure rather than a runaway bill.
 */
export const SMOKE_MODEL_ID = "google:gemini-2.5-flash";
