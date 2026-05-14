import { describe, expect, it, vi } from "vitest";
import { GENERATION_MAINTENANCE_CRON } from "./generation-maintenance";
import { runMaintenanceStep } from "./maintenance-utils";

describe("generationMaintenance", () => {
  it("runs one consolidated production schedule every five minutes", () => {
    expect(GENERATION_MAINTENANCE_CRON).toEqual({
      pattern: "*/5 * * * *",
      timezone: "UTC",
      environments: ["PRODUCTION"],
    });
  });

  it("captures step failures without throwing", async () => {
    const result = await runMaintenanceStep(async () => {
      throw new Error("boom");
    });

    expect(result).toEqual({ ok: false, error: "boom" });
  });

  it("captures step successes", async () => {
    const step = vi.fn().mockResolvedValue({ recovered: 1 });

    await expect(runMaintenanceStep(step)).resolves.toEqual({
      ok: true,
      value: { recovered: 1 },
    });
  });
});
