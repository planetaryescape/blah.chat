/**
 * @vitest-environment node
 */
import type { Ratelimit } from "@upstash/ratelimit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyRateLimit } from "../rate-limit";

vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

class FakeRatelimit {
  public calls: string[] = [];
  constructor(
    private readonly results: Array<{
      success: boolean;
      reset: number;
      limit: number;
      remaining: number;
    }>,
  ) {}

  async limit(identifier: string) {
    this.calls.push(identifier);
    const next = this.results.shift();
    if (!next) {
      throw new Error("FakeRatelimit: ran out of canned results");
    }
    return next;
  }
}

class ThrowingRatelimit {
  async limit() {
    throw new TypeError("fetch failed");
  }
}

const NOW = 1_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("applyRateLimit", () => {
  it("returns null when the limiter reports success", async () => {
    const limiter = new FakeRatelimit([
      { success: true, reset: NOW + 60_000, limit: 10, remaining: 9 },
    ]) as unknown as Ratelimit;

    const result = await applyRateLimit(limiter, "user_a");

    expect(result).toBeNull();
  });

  it("returns a 429 NextResponse with Retry-After when the limiter reports failure", async () => {
    const limiter = new FakeRatelimit([
      { success: false, reset: NOW + 30_000, limit: 5, remaining: 0 },
    ]) as unknown as Ratelimit;

    const response = await applyRateLimit(limiter, "user_b");

    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("30");
    const body = await response?.json();
    expect(body).toMatchObject({ status: "error" });
  });

  it("scopes the bucket to the identifier passed in", async () => {
    const fake = new FakeRatelimit([
      { success: true, reset: NOW + 60_000, limit: 10, remaining: 9 },
      { success: true, reset: NOW + 60_000, limit: 10, remaining: 9 },
    ]);

    await applyRateLimit(fake as unknown as Ratelimit, "user_a");
    await applyRateLimit(fake as unknown as Ratelimit, "user_b");

    expect(fake.calls).toEqual(["user_a", "user_b"]);
  });

  it("uses 1 as the floor for Retry-After when reset is in the past", async () => {
    const limiter = new FakeRatelimit([
      { success: false, reset: NOW - 5_000, limit: 5, remaining: 0 },
    ]) as unknown as Ratelimit;

    const response = await applyRateLimit(limiter, "user_c");

    expect(response?.headers.get("Retry-After")).toBe("1");
  });

  it("returns a helpful 503 when the limiter backend is unavailable", async () => {
    const response = await applyRateLimit(
      new ThrowingRatelimit() as unknown as Ratelimit,
      "user_d",
    );

    expect(response?.status).toBe(503);
    const body = await response?.json();
    expect(body).toMatchObject({
      status: "error",
      error: {
        code: "RATE_LIMIT_SERVICE_UNAVAILABLE",
        message:
          "Message sending is temporarily unavailable. Please try again in a minute.",
      },
    });
  });
});
