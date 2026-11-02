// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  create: vi.fn(),
  runCode: vi.fn(),
  kill: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@e2b/code-interpreter", () => ({ Sandbox: { create: mocks.create } }));

beforeEach(() => {
  vi.stubEnv(
    "INTERNAL_API_SECRET",
    "test-service-secret-with-at-least-32-characters",
  );
  vi.stubEnv("E2B_API_KEY", "test-e2b-key");
  mocks.auth.mockResolvedValue({ userId: null });
  mocks.create.mockResolvedValue({ runCode: mocks.runCode, kill: mocks.kill });
  mocks.runCode.mockResolvedValue({
    logs: { stdout: ["ok"], stderr: [] },
    text: "ok",
    results: [],
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function request(input: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://example.test/api/code-execution", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(input),
  });
}

describe("E2B execution boundary", () => {
  it("rejects forged internal headers without calling E2B", async () => {
    const response = await POST(
      request(
        { code: "print(1)", language: "python" },
        { "X-Convex-Internal": "true", "X-Internal-Call": "true" },
      ),
    );
    expect(response.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([
    { code: 123, language: "python" },
    { code: "1", language: "shell" },
    { code: "1", language: "python", timeout: -1 },
    { code: "1", language: "python", timeout: "30" },
    { code: "1", language: "python", timeout: 61 },
    { code: "x".repeat(130_000), language: "python" },
  ])("rejects invalid runtime inputs", async (input) => {
    mocks.auth.mockResolvedValue({ userId: "user" });
    expect((await POST(request(input))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("permits secret-authenticated Convex and signed-in users, sets execution limits, and kills the sandbox", async () => {
    const calls: Record<string, string>[] = [
      { Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}` },
      {},
    ];
    for (const headers of calls) {
      if (!("Authorization" in headers))
        mocks.auth.mockResolvedValue({ userId: "user" });
      expect(
        (
          await POST(
            request(
              { code: "console.log(1)", language: "javascript", timeout: 10 },
              headers,
            ),
          )
        ).status,
      ).toBe(200);
    }
    expect(mocks.runCode).toHaveBeenCalledWith("console.log(1)", {
      language: "javascript",
      timeoutMs: 10_000,
    });
    expect(mocks.kill).toHaveBeenCalledTimes(2);
  });
});
