import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { checkHealth } from "./check-health";

describe("checkHealth", () => {
  it("reports postgres healthy when db is reachable", async () => {
    const db = await createTestPersistenceDb();
    const result = await checkHealth({ db });

    expect(result.postgres.healthy).toBe(true);
    expect(result.postgres.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
