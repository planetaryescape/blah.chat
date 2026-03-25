import { describe, expect, test, vi } from "vitest";
import { type ByodHealthCheckDeps, checkByodHealth } from "./byod-health-check";

function createMockDeps(
  overrides?: Partial<ByodHealthCheckDeps>,
): ByodHealthCheckDeps {
  return {
    db: {} as any,
    findAllConnected: vi.fn().mockResolvedValue([]),
    decrypt: vi
      .fn()
      .mockResolvedValue("postgresql://user:pass@ep-test.neon.tech/db"),
    testConnection: vi.fn().mockResolvedValue({ valid: true, latencyMs: 42 }),
    updateHealthCheck: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("checkByodHealth", () => {
  test("returns empty results when no connected configs", async () => {
    const deps = createMockDeps();
    const result = await checkByodHealth(deps);
    expect(result.checked).toBe(0);
    expect(result.healthy).toBe(0);
    expect(result.unhealthy).toBe(0);
  });

  test("checks all connected configs", async () => {
    const configs = [
      {
        id: "cfg1",
        encryptedConnectionString: "enc1",
        encryptionIv: "iv1",
        authTag: "tag1",
      },
      {
        id: "cfg2",
        encryptedConnectionString: "enc2",
        encryptionIv: "iv2",
        authTag: "tag2",
      },
    ];
    const deps = createMockDeps({
      findAllConnected: vi.fn().mockResolvedValue(configs),
    });

    const result = await checkByodHealth(deps);

    expect(result.checked).toBe(2);
    expect(result.healthy).toBe(2);
    expect(deps.decrypt).toHaveBeenCalledTimes(2);
    expect(deps.updateHealthCheck).toHaveBeenCalledTimes(2);
  });

  test("counts unhealthy connections", async () => {
    const configs = [
      {
        id: "cfg1",
        encryptedConnectionString: "enc1",
        encryptionIv: "iv1",
        authTag: "tag1",
      },
    ];
    const deps = createMockDeps({
      findAllConnected: vi.fn().mockResolvedValue(configs),
      testConnection: vi.fn().mockResolvedValue({ valid: false, latencyMs: 0 }),
    });

    const result = await checkByodHealth(deps);
    expect(result.unhealthy).toBe(1);
    expect(result.healthy).toBe(0);
  });

  test("handles decrypt failure gracefully", async () => {
    const configs = [
      {
        id: "cfg1",
        encryptedConnectionString: "enc1",
        encryptionIv: "iv1",
        authTag: "tag1",
      },
    ];
    const deps = createMockDeps({
      findAllConnected: vi.fn().mockResolvedValue(configs),
      decrypt: vi.fn().mockRejectedValue(new Error("bad key")),
    });

    const result = await checkByodHealth(deps);
    expect(result.errors).toBe(1);
    expect(result.checked).toBe(1);
  });
});
