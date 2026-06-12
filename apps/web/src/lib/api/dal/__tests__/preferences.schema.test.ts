/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: vi.fn(),
}));

import { preferenceValueSchema } from "../preferences";

describe("preferenceValueSchema", () => {
  it("accepts plain JSON-serializable values", () => {
    expect(preferenceValueSchema.safeParse("dark").success).toBe(true);
    expect(preferenceValueSchema.safeParse(42).success).toBe(true);
    expect(preferenceValueSchema.safeParse(true).success).toBe(true);
    expect(preferenceValueSchema.safeParse(null).success).toBe(true);
    expect(
      preferenceValueSchema.safeParse({ theme: "dark", fontSize: 14 }).success,
    ).toBe(true);
    expect(preferenceValueSchema.safeParse(["a", "b"]).success).toBe(true);
  });

  it("rejects undefined and functions (not JSON-serializable)", () => {
    expect(preferenceValueSchema.safeParse(undefined).success).toBe(false);
    expect(preferenceValueSchema.safeParse(() => "nope").success).toBe(false);
  });

  it("rejects values containing circular references", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(preferenceValueSchema.safeParse(circular).success).toBe(false);
  });

  it("rejects values whose serialized form exceeds 16000 characters", () => {
    const big = { blob: "x".repeat(16_001) };
    expect(preferenceValueSchema.safeParse(big).success).toBe(false);

    const fits = { blob: "x".repeat(15_000) };
    expect(preferenceValueSchema.safeParse(fits).success).toBe(true);
  });
});
