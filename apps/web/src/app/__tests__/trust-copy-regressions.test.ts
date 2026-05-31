/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import landingSource from "../LandingPageClient.tsx?raw";
import privacySource from "../privacy/page.tsx?raw";
import termsSource from "../terms/page.tsx?raw";

describe("public trust copy", () => {
  it("does not claim BYOK keys are never stored", () => {
    expect(privacySource).not.toContain("We never store them");
    expect(privacySource).not.toContain(
      "Your API keys (BYOK mode - sent directly to providers)",
    );
    expect(privacySource).toContain("BYOK keys are encrypted at rest");
  });

  it("labels BYOD as preview or coming soon instead of GA-ready storage", () => {
    expect(privacySource).not.toContain(
      "Data from your personal Postgres database (BYOD mode)",
    );
    expect(termsSource).not.toContain(
      "BYOD mode keeps your data in your own database",
    );
    expect(landingSource).not.toContain("BYOD: Your database");
    expect(`${privacySource}\n${termsSource}\n${landingSource}`).toContain(
      "BYOD preview",
    );
  });
});
