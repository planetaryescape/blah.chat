import { beforeEach, describe, expect, test, vi } from "vitest";

const createNeonClient = vi.fn();
const drizzleNeon = vi.fn(() => ({ kind: "neon-db" }));

vi.mock("@neondatabase/serverless", () => ({
  neon: createNeonClient,
}));

vi.mock("drizzle-orm/neon-http", () => ({
  drizzle: drizzleNeon,
}));

describe("createPersistenceDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("uses node-postgres for local docker-stack urls", async () => {
    const drizzleNodePg = vi.fn(() => ({ kind: "pg-db" }));
    const Pool = vi.fn().mockImplementation(function MockPool(config) {
      return { config };
    });
    vi.spyOn(process, "getBuiltinModule").mockReturnValue({
      createRequire: () => (specifier: string) => {
        if (specifier === "pg") {
          return { Pool };
        }
        if (specifier === "drizzle-orm/node-postgres") {
          return { drizzle: drizzleNodePg };
        }
        throw new Error(`Unexpected require: ${specifier}`);
      },
    } as never);

    const { createPersistenceDatabase } = await import("../src/db");

    const db = createPersistenceDatabase(
      "postgresql://blah:blah@127.0.0.1:55432/blah_chat",
    );

    expect(Pool).toHaveBeenCalledWith({
      connectionString: "postgresql://blah:blah@127.0.0.1:55432/blah_chat",
    });
    expect(drizzleNodePg).toHaveBeenCalledTimes(1);
    expect(createNeonClient).not.toHaveBeenCalled();
    expect(drizzleNeon).not.toHaveBeenCalled();
    expect(db).toEqual({ kind: "pg-db" });
  });

  test("keeps neon-http for neon hosts", async () => {
    vi.spyOn(process, "getBuiltinModule").mockReturnValue({
      createRequire: () => {
        throw new Error("should not require node-postgres");
      },
    } as never);

    const { createPersistenceDatabase } = await import("../src/db");

    const db = createPersistenceDatabase(
      "postgresql://user:pass@ep-test-123.us-east-1.aws.neon.tech/db?sslmode=require",
    );

    expect(createNeonClient).toHaveBeenCalledWith(
      "postgresql://user:pass@ep-test-123.us-east-1.aws.neon.tech/db?sslmode=require",
    );
    expect(drizzleNeon).toHaveBeenCalledTimes(1);
    expect(db).toEqual({ kind: "neon-db" });
  });
});
