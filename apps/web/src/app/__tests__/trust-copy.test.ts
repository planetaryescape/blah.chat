/**
 * @vitest-environment node
 */
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("public trust copy", () => {
  it("does not claim BYOK keys are never stored", async () => {
    const privacy = await readFile("src/app/privacy/page.tsx", "utf8");

    expect(privacy).not.toContain("We never store them");
    expect(privacy).not.toContain(
      "Your API keys (BYOK mode - sent directly to providers)",
    );
    expect(privacy).toContain("BYOK keys are encrypted at rest");
  });

  it("labels BYOD as preview or coming soon instead of GA-ready storage", async () => {
    const [privacy, terms, landing] = await Promise.all([
      readFile("src/app/privacy/page.tsx", "utf8"),
      readFile("src/app/terms/page.tsx", "utf8"),
      readFile("src/app/LandingPageClient.tsx", "utf8"),
    ]);

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
