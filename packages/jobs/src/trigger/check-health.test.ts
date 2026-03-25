import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { CHECK_HEALTH_CRON, checkHealth } from "./check-health";

describe("checkHealth", () => {
  it("runs on the six-hour production cron", () => {
    expect(CHECK_HEALTH_CRON).toEqual({
      pattern: "0 */6 * * *",
      environments: ["PRODUCTION"],
      timezone: "UTC",
    });
  });

  it("reports postgres healthy when db is reachable", async () => {
    const db = await createTestPersistenceDb();
    const result = await checkHealth({ db });

    expect(result.postgres.healthy).toBe(true);
    expect(result.postgres.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
