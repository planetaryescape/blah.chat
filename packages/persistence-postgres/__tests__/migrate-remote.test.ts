import { describe, expect, test, vi } from "vitest";
import {
  getTargetSchemaVersion,
  type MigrationDeps,
  runPendingMigrations,
} from "../src/byod/migrate-remote";

// Mock journal matching real structure
const MOCK_JOURNAL = {
  version: "7",
  dialect: "postgresql",
  entries: [
    {
      idx: 0,
      version: "7",
      when: 1000,
      tag: "0000_initial",
      breakpoints: true,
    },
    { idx: 1, version: "7", when: 2000, tag: "0001_second", breakpoints: true },
    { idx: 2, version: "7", when: 3000, tag: "0002_third", breakpoints: true },
  ],
};

const MOCK_SQL_FILES: Record<string, string> = {
  "0000_initial": "CREATE TABLE foo (id text);",
  "0001_second": "ALTER TABLE foo ADD COLUMN name text;",
  "0002_third": "CREATE TABLE bar (id text);",
};

function createMockDeps(overrides?: Partial<MigrationDeps>): MigrationDeps {
  return {
    readJournal: vi.fn().mockResolvedValue(MOCK_JOURNAL),
    readMigrationSql: vi.fn().mockImplementation(async (tag: string) => {
      return MOCK_SQL_FILES[tag] ?? "";
    }),
    ...overrides,
  };
}

describe("getTargetSchemaVersion", () => {
  test("returns journal entry count", async () => {
    const deps = createMockDeps();
    const version = await getTargetSchemaVersion(deps);
    expect(version).toBe(3);
  });

  test("returns 0 for empty journal", async () => {
    const deps = createMockDeps({
      readJournal: vi.fn().mockResolvedValue({
        ...MOCK_JOURNAL,
        entries: [],
      }),
    });
    const version = await getTargetSchemaVersion(deps);
    expect(version).toBe(0);
  });
});

describe("runPendingMigrations", () => {
  test("applies all migrations from index 0", async () => {
    const executedSql: string[] = [];
    const mockDb = {
      execute: vi.fn().mockImplementation((query: any) => {
        executedSql.push(query.queryChunks?.[0]?.value?.[0] ?? String(query));
        return Promise.resolve();
      }),
    };
    const deps = createMockDeps();

    const result = await runPendingMigrations(mockDb as any, 0, deps);

    expect(result.applied).toHaveLength(3);
    expect(result.applied[0]?.tag).toBe("0000_initial");
    expect(result.applied[1]?.tag).toBe("0001_second");
    expect(result.applied[2]?.tag).toBe("0002_third");
    expect(result.newVersion).toBe(3);
    expect(result.applied.every((m) => m.status === "completed")).toBe(true);
  });

  test("skips already-applied migrations", async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const deps = createMockDeps();

    const result = await runPendingMigrations(mockDb as any, 2, deps);

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]?.tag).toBe("0002_third");
    expect(result.newVersion).toBe(3);
  });

  test("returns empty when already at latest", async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const deps = createMockDeps();

    const result = await runPendingMigrations(mockDb as any, 3, deps);

    expect(result.applied).toHaveLength(0);
    expect(result.newVersion).toBe(3);
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  test("records failure and stops on SQL error", async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockResolvedValueOnce(undefined) // first migration succeeds
        .mockRejectedValueOnce(new Error("syntax error")), // second fails
    };
    const deps = createMockDeps();

    const result = await runPendingMigrations(mockDb as any, 0, deps);

    expect(result.applied).toHaveLength(2);
    expect(result.applied[0]?.status).toBe("completed");
    expect(result.applied[1]?.status).toBe("failed");
    expect(result.applied[1]?.error).toContain("syntax error");
    // Version advances to last successful + 1
    expect(result.newVersion).toBe(1);
  });

  test("handles empty SQL files gracefully", async () => {
    const deps = createMockDeps({
      readMigrationSql: vi.fn().mockResolvedValue(""),
    });
    const mockDb = {
      execute: vi.fn().mockResolvedValue(undefined),
    };

    const result = await runPendingMigrations(mockDb as any, 0, deps);

    // Empty SQL should be skipped
    expect(result.applied).toHaveLength(3);
    expect(result.applied.every((m) => m.status === "completed")).toBe(true);
  });

  test("splits multi-statement SQL on breakpoints", async () => {
    const multiStatementSql =
      "CREATE TABLE a (id text);\n--> statement-breakpoint\nCREATE TABLE b (id text);";
    const deps = createMockDeps({
      readMigrationSql: vi.fn().mockResolvedValue(multiStatementSql),
      readJournal: vi.fn().mockResolvedValue({
        ...MOCK_JOURNAL,
        entries: [MOCK_JOURNAL.entries[0]],
      }),
    });
    const executeCalls: unknown[] = [];
    const mockDb = {
      execute: vi.fn().mockImplementation((q: unknown) => {
        executeCalls.push(q);
        return Promise.resolve();
      }),
    };

    await runPendingMigrations(mockDb as any, 0, deps);

    // Should execute 2 separate statements
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });
});
