import { describe, expect, test, vi } from "vitest";
import {
  type ByodMigrationDeps,
  runByodMigrations,
} from "./byod-run-migrations";

function createMockDeps(
  overrides?: Partial<ByodMigrationDeps>,
): ByodMigrationDeps {
  return {
    db: {} as any,
    findAllPendingMigrations: vi.fn().mockResolvedValue([]),
    decrypt: vi
      .fn()
      .mockResolvedValue("postgresql://user:pass@ep-test.neon.tech/db"),
    runPendingMigrations: vi.fn().mockResolvedValue({
      applied: [],
      newVersion: 3,
    }),
    getTargetSchemaVersion: vi.fn().mockResolvedValue(3),
    updateMigrationStatus: vi.fn().mockResolvedValue(undefined),
    createMigrationLog: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("runByodMigrations", () => {
  test("returns empty when no pending configs", async () => {
    const deps = createMockDeps();
    const result = await runByodMigrations(deps);
    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
  });

  test("runs migrations for each pending config", async () => {
    const configs = [
      {
        id: "cfg1",
        userId: "u1",
        encryptedConnectionString: "enc1",
        encryptionIv: "iv1",
        authTag: "tag1",
        schemaVersion: 0,
      },
      {
        id: "cfg2",
        userId: "u2",
        encryptedConnectionString: "enc2",
        encryptionIv: "iv2",
        authTag: "tag2",
        schemaVersion: 1,
      },
    ];

    const runMigrations = vi.fn().mockResolvedValue({
      applied: [
        { index: 0, tag: "0000_init", status: "completed", durationMs: 10 },
      ],
      newVersion: 3,
    });

    const deps = createMockDeps({
      findAllPendingMigrations: vi.fn().mockResolvedValue(configs),
      runPendingMigrations: runMigrations,
    });

    const result = await runByodMigrations(deps);

    expect(result.processed).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(deps.updateMigrationStatus).toHaveBeenCalledTimes(4); // running + up_to_date for each
  });

  test("marks failed migrations correctly", async () => {
    const configs = [
      {
        id: "cfg1",
        userId: "u1",
        encryptedConnectionString: "enc1",
        encryptionIv: "iv1",
        authTag: "tag1",
        schemaVersion: 0,
      },
    ];

    const deps = createMockDeps({
      findAllPendingMigrations: vi.fn().mockResolvedValue(configs),
      runPendingMigrations: vi.fn().mockResolvedValue({
        applied: [
          {
            index: 0,
            tag: "0000_init",
            status: "failed",
            error: "syntax error",
            durationMs: 5,
          },
        ],
        newVersion: 0,
      }),
    });

    const result = await runByodMigrations(deps);

    expect(result.failed).toBe(1);
    expect(deps.updateMigrationStatus).toHaveBeenCalledWith(
      "cfg1",
      "failed",
      0,
      "syntax error",
    );
  });

  test("handles decrypt errors gracefully", async () => {
    const configs = [
      {
        id: "cfg1",
        userId: "u1",
        encryptedConnectionString: "enc1",
        encryptionIv: "iv1",
        authTag: "tag1",
        schemaVersion: 0,
      },
    ];

    const deps = createMockDeps({
      findAllPendingMigrations: vi.fn().mockResolvedValue(configs),
      decrypt: vi.fn().mockRejectedValue(new Error("bad key")),
    });

    const result = await runByodMigrations(deps);
    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(0);
  });

  test("logs each applied migration", async () => {
    const configs = [
      {
        id: "cfg1",
        userId: "u1",
        encryptedConnectionString: "enc1",
        encryptionIv: "iv1",
        authTag: "tag1",
        schemaVersion: 0,
      },
    ];

    const createLog = vi.fn().mockResolvedValue(undefined);
    const deps = createMockDeps({
      findAllPendingMigrations: vi.fn().mockResolvedValue(configs),
      runPendingMigrations: vi.fn().mockResolvedValue({
        applied: [
          { index: 0, tag: "0000_init", status: "completed", durationMs: 10 },
          { index: 1, tag: "0001_second", status: "completed", durationMs: 15 },
        ],
        newVersion: 2,
      }),
      createMigrationLog: createLog,
    });

    await runByodMigrations(deps);
    expect(createLog).toHaveBeenCalledTimes(2);
  });
});
