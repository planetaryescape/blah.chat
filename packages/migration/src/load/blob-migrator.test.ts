import { describe, expect, it, vi } from "vitest";
import { migrateBlobs } from "./blob-migrator";

describe("migrateBlobs", () => {
  it("returns zero counts for empty entries", async () => {
    const result = await migrateBlobs([], {
      convexUrl: "https://test.convex.cloud",
      r2Client: {} as never,
      r2Bucket: "test-bucket",
    });
    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("tracks failed downloads in errors array", async () => {
    // Mock fetch to fail
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await migrateBlobs(
      [{ storageId: "s1", targetKey: "k1", contentType: "image/png" }],
      {
        convexUrl: "https://test.convex.cloud",
        r2Client: {} as never,
        r2Bucket: "test-bucket",
      },
    );

    expect(result.failed).toBe(1);
    expect(result.errors[0].storageId).toBe("s1");
    expect(result.errors[0].error).toContain("Network error");

    globalThis.fetch = originalFetch;
  });

  it("skips 404 responses (blob already gone)", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const result = await migrateBlobs(
      [{ storageId: "s1", targetKey: "k1", contentType: "image/png" }],
      {
        convexUrl: "https://test.convex.cloud",
        r2Client: {} as never,
        r2Bucket: "test-bucket",
      },
    );

    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);

    globalThis.fetch = originalFetch;
  });
});
