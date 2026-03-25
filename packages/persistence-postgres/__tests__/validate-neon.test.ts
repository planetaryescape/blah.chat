import { describe, expect, test, vi } from "vitest";
import {
  testNeonConnection,
  validateNeonConnectionString,
} from "../src/byod/validate-neon";

describe("validateNeonConnectionString", () => {
  test("accepts valid neon.tech connection string", () => {
    const result = validateNeonConnectionString(
      "postgresql://user:pass@ep-cool-123.us-east-1.aws.neon.tech/mydb?sslmode=require",
    );
    expect(result.valid).toBe(true);
    expect(result.neonProjectId).toBe("ep-cool-123");
    expect(result.error).toBeUndefined();
  });

  test("accepts neon.tech without sslmode", () => {
    const result = validateNeonConnectionString(
      "postgresql://user:pass@ep-cool-123.us-east-1.aws.neon.tech/mydb",
    );
    expect(result.valid).toBe(true);
  });

  test("extracts project ID from endpoint hostname", () => {
    const result = validateNeonConnectionString(
      "postgresql://user:pass@ep-shiny-moon-456.eu-central-1.aws.neon.tech/db",
    );
    expect(result.neonProjectId).toBe("ep-shiny-moon-456");
  });

  test("rejects non-neon.tech host", () => {
    const result = validateNeonConnectionString(
      "postgresql://user:pass@my-rds.amazonaws.com/db",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("neon.tech");
  });

  test("rejects invalid URL", () => {
    const result = validateNeonConnectionString("not-a-url");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("rejects empty string", () => {
    const result = validateNeonConnectionString("");
    expect(result.valid).toBe(false);
  });

  test("rejects localhost", () => {
    const result = validateNeonConnectionString(
      "postgresql://user:pass@localhost:5432/db",
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("neon.tech");
  });

  test("rejects supabase host", () => {
    const result = validateNeonConnectionString(
      "postgresql://user:pass@db.abcdef.supabase.co/postgres",
    );
    expect(result.valid).toBe(false);
  });
});

describe("testNeonConnection", () => {
  test("returns valid=true with latency on success", async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    };

    const result = await testNeonConnection(mockDb as any);
    expect(result.valid).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  test("returns valid=false on query failure", async () => {
    const mockDb = {
      execute: vi.fn().mockRejectedValue(new Error("connection refused")),
    };

    const result = await testNeonConnection(mockDb as any);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("connection refused");
  });

  test("returns valid=false on timeout", async () => {
    const mockDb = {
      execute: vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("aborted")), 50),
            ),
        ),
    };

    const result = await testNeonConnection(mockDb as any, 10);
    expect(result.valid).toBe(false);
  });
});
