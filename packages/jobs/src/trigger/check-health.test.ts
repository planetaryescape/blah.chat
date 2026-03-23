import { describe, expect, it } from "vitest";
import { CHECK_HEALTH_CRON } from "./check-health";

describe("checkHealthTask schedule", () => {
  it("runs on the six-hour production cron", () => {
    expect(CHECK_HEALTH_CRON).toEqual({
      pattern: "0 */6 * * *",
      environments: ["PRODUCTION"],
      timezone: "UTC",
    });
  });
});
