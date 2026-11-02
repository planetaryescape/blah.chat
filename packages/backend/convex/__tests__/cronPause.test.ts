import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("cutover cron pause", () => {
  it("registers no scheduled jobs while a restore is incomplete", async () => {
    vi.stubEnv("CUTOVER_PAUSE_CRONS", "true");
    vi.resetModules();
    const { default: crons } = await import("../crons");
    expect(crons.export()).toBe("{}");
  });

  it("retains scheduled recovery after the explicit pause is cleared", async () => {
    vi.stubEnv("CUTOVER_PAUSE_CRONS", "false");
    vi.resetModules();
    const { default: crons } = await import("../crons");
    const jobs = JSON.parse(crons.export());
    expect(jobs).toHaveProperty("recover-stuck-messages");
    expect(jobs).toHaveProperty("extract-inactive-conversations");
  });
});
