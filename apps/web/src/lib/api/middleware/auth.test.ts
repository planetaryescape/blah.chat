/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { auth } from "@clerk/nextjs/server";
import { withAuth, withOptionalAuth } from "./auth";

describe("api auth middleware", () => {
  it("withAuth does not swallow handler errors", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user-1",
      getToken: vi.fn().mockResolvedValue("token-1"),
    } as any);

    const handler = vi.fn(async () => {
      throw new Error("boom");
    });

    const wrapped = withAuth(handler as any);
    await expect(
      wrapped(new Request("https://example.com") as any, {
        params: Promise.resolve({}),
      }),
    ).rejects.toThrow("boom");
  });

  it("withOptionalAuth does not swallow handler errors", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user-1" } as any);

    const handler = vi.fn(async () => {
      throw new Error("boom");
    });

    const wrapped = withOptionalAuth(handler as any);
    await expect(
      wrapped(new Request("https://example.com") as any, {
        params: Promise.resolve({}),
      }),
    ).rejects.toThrow("boom");
  });
});
