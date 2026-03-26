import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("jobs DAL (dead code removal)", () => {
  const source = readFileSync(resolve(__dirname, "jobs.ts"), "utf-8");

  it("does not contain convexMutation parameter", () => {
    expect(source).not.toContain("convexMutation");
  });

  it("does not contain convexQuery parameter", () => {
    expect(source).not.toContain("convexQuery");
  });

  it("does not reference internal.jobs", () => {
    expect(source).not.toContain("internal.jobs");
  });

  it("does not reference api.jobs.crud", () => {
    expect(source).not.toContain("api.jobs.crud");
  });

  it("uses Trigger.dev for job creation", () => {
    expect(source).toContain("triggerTask");
  });
});
