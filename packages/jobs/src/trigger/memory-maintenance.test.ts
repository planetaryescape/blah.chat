import { describe, expect, it } from "vitest";
import { MEMORY_MAINTENANCE_CRON } from "./memory-maintenance";

describe("memoryMaintenance", () => {
  it("runs one consolidated production schedule hourly", () => {
    expect(MEMORY_MAINTENANCE_CRON).toEqual({
      pattern: "0 * * * *",
      timezone: "UTC",
      environments: ["PRODUCTION"],
    });
  });
});
