/**
 * @vitest-environment node
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appDir = dirname(dirname(fileURLToPath(import.meta.url)));

async function readAppFile(path: string) {
  return readFile(join(appDir, path), "utf8");
}

describe("public trust copy", () => {
  it("does not claim BYOK keys are never stored", async () => {
    const privacy = await readAppFile("privacy/page.tsx");

    expect(privacy).not.toContain("We never store them");
    expect(privacy).not.toContain(
      "Your API keys (BYOK mode - sent directly to providers)",
    );
    expect(privacy).toContain("BYOK keys are encrypted at rest");
  });

  it("labels BYOD as preview or coming soon instead of GA-ready storage", async () => {
    const [privacy, terms, landing] = await Promise.all([
      readAppFile("privacy/page.tsx"),
      readAppFile("terms/page.tsx"),
      readAppFile("LandingPageClient.tsx"),
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
