/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import landing from "../LandingPageClient.tsx?raw";
import privacy from "../privacy/page.tsx?raw";
import terms from "../terms/page.tsx?raw";

describe("public trust copy", () => {
  it("does not claim BYOK keys are never stored", () => {
    expect(privacy).not.toContain("We never store them");
    expect(privacy).not.toContain(
      "Your API keys (BYOK mode - sent directly to providers)",
    );
    expect(privacy).toContain("BYOK keys are encrypted at rest");
  });

  it("labels BYOD as preview or coming soon instead of GA-ready storage", () => {
    expect(privacy).not.toContain(
      "Data from your personal Postgres database (BYOD mode)",
    );
    expect(terms).not.toContain(
      "BYOD mode keeps your data in your own database",
    );
    expect(landing).not.toContain("BYOD: Your database");
    expect(`${privacy}\n${terms}\n${landing}`).toContain("BYOD preview");
  });
});
