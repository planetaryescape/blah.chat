/** @vitest-environment node */

import { getFunctionName } from "convex/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  mutation: vi.fn(),
  auth: vi.fn(),
  fetchAction: vi.fn(),
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/api/monitoring", () => ({ trackAPIPerformance: vi.fn() }));
vi.mock("@/lib/api/convex", () => ({
  getAuthenticatedConvexClient: vi.fn(() => ({
    query: mocks.query,
    mutation: mocks.mutation,
  })),
}));
vi.mock("convex/nextjs", () => ({
  fetchAction: mocks.fetchAction,
  fetchQuery: mocks.fetchQuery,
  fetchMutation: mocks.fetchMutation,
}));

import { isCliCallback } from "@/lib/api/cliCallback";
import { getAuthenticatedConvexClient } from "@/lib/api/convex";
import { withAuth } from "@/lib/api/middleware/auth";
import { createSSEResponse } from "@/lib/api/sse/utils";
import { parseListLimit } from "@/lib/api/utils";
import { GET as job } from "./v1/actions/jobs/[id]/route";
import { POST as transcribe } from "./v1/actions/transcribe/route";
import { GET as verse } from "./v1/bible/verse/route";
import { POST as pin } from "./v1/conversations/[id]/pin/route";
import { DELETE as deleteConversation } from "./v1/conversations/[id]/route";
import { POST as regenerate } from "./v1/messages/[id]/regenerate/route";
import { PATCH as preferences } from "./v1/preferences/route";
import { POST as search } from "./v1/search/hybrid/route";

const context = { params: Promise.resolve({ id: "test-id" }) };
function req(body?: unknown) {
  const init: { method: string; body?: string } = { method: "POST" };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest("https://example.test/api", init);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    userId: "clerk-owner",
    getToken: vi.fn().mockResolvedValue("convex-token"),
  });
  mocks.query.mockResolvedValue({ _id: "test-id", pinned: true });
  mocks.mutation.mockImplementation(async (ref) =>
    getFunctionName(ref) === "apiRateLimits:consume"
      ? { allowed: true }
      : "new-id",
  );
  mocks.fetchMutation.mockResolvedValue("job-id");
  mocks.fetchQuery.mockResolvedValue({ _id: "job-id", status: "pending" });
  mocks.fetchAction.mockResolvedValue([]);
});

describe("v1 boundary compatibility", () => {
  it("passes the Convex token to transcription creation, poll and search", async () => {
    expect(
      (await transcribe(req({ storageId: "storage" }), context)).status,
    ).toBe(202);
    expect(mocks.fetchMutation.mock.calls[0].slice(1)).toEqual([
      { storageId: "storage", model: undefined },
      { token: "convex-token" },
    ]);
    expect((await job(req(), context)).status).toBe(200);
    expect(mocks.fetchQuery.mock.calls[0][2]).toEqual({
      token: "convex-token",
    });
    await search(req({ query: "test" }), context);
    expect(mocks.fetchAction.mock.calls[0][2]).toEqual({
      token: "convex-token",
    });
  });
  it("preserves regeneration model selection and permits an omitted body", async () => {
    expect(
      (await regenerate(req({ modelId: "chosen-model" }), context)).status,
    ).toBe(202);
    expect(mocks.mutation.mock.calls[0][1]).toEqual({
      operation: "regenerate",
    });
    expect(mocks.mutation.mock.calls[1][1]).toEqual({
      messageId: "test-id",
      modelId: "chosen-model",
    });
    expect((await regenerate(req(), context)).status).toBe(202);
    expect(
      (
        await regenerate(
          new NextRequest("https://example.test", {
            method: "POST",
            body: "{",
          }),
          context,
        )
      ).status,
    ).toBe(400);
  });
  it("consumes each operation with the authenticated client before paid work", async () => {
    await regenerate(req(), context);
    expect(getAuthenticatedConvexClient).toHaveBeenCalledWith("convex-token");
    expect(getFunctionName(mocks.mutation.mock.calls[0][0])).toBe(
      "apiRateLimits:consume",
    );
    expect(mocks.mutation.mock.calls[0][1]).toEqual({
      operation: "regenerate",
    });
    expect(getFunctionName(mocks.mutation.mock.calls[1][0])).toBe(
      "chat:regenerate",
    );
    await search(req({ query: "synthetic search" }), context);
    expect(mocks.mutation.mock.calls[2][1]).toEqual({
      operation: "hybrid-search",
    });
    expect(mocks.mutation.mock.invocationCallOrder[2]).toBeLessThan(
      mocks.fetchAction.mock.invocationCallOrder[0],
    );
    expect(mocks.fetchAction.mock.calls[0][2]).toEqual({
      token: "convex-token",
    });
  });
  it.each([
    "regenerate",
    "hybrid-search",
  ])("returns a 429 envelope and never starts paid %s when exhausted", async (operation) => {
    mocks.mutation.mockResolvedValue({ allowed: false });
    const response =
      operation === "regenerate"
        ? await regenerate(req(), context)
        : await search(req({ query: "synthetic search" }), context);
    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const envelope = await response.json();
    expect(envelope.status).toBe("error");
    expect(envelope.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(mocks.mutation).toHaveBeenCalledTimes(1);
    expect(mocks.mutation.mock.calls[0][1]).toEqual({ operation });
    expect(mocks.fetchAction).not.toHaveBeenCalled();
  });
  it("rejects invalid request bodies before consuming quota", async () => {
    expect((await regenerate(req({ modelId: 42 }), context)).status).toBe(400);
    expect((await search(req({ query: "" }), context)).status).toBe(400);
    expect(mocks.mutation).not.toHaveBeenCalled();
    expect(mocks.fetchAction).not.toHaveBeenCalled();
  });
  it("bounds preferences and rejects missing values before persistence", async () => {
    for (const body of [{ key: "x" }, { key: "x", value: "x".repeat(16001) }]) {
      expect((await preferences(req(body), context)).status).toBe(400);
    }
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it("returns JSON deletion and full pin envelopes rather than empty/ID-only payloads", async () => {
    const deleted = await deleteConversation(req(), context);
    expect(deleted.status).toBe(200);
    expect((await deleted.json()).data.deleted).toBe(true);
    const pinned = await (await pin(req(), context)).json();
    expect(pinned.sys.id).toBe("test-id");
    expect(pinned.data.pinned).toBe(true);
  });
  it("normalizes Convex case-sensitive errors and refuses anonymous requests", async () => {
    mocks.mutation.mockRejectedValue(new Error("Not found"));
    expect((await pin(req(), context)).status).toBe(404);
    mocks.auth.mockResolvedValue({ userId: null });
    expect(
      (await transcribe(req({ storageId: "storage" }), context)).status,
    ).toBe(401);
    expect(mocks.fetchMutation).not.toHaveBeenCalled();
  });
  it("overrides private cache presets for every authenticated account", async () => {
    const wrapped = withAuth(
      async () =>
        new Response("private", {
          headers: { "Cache-Control": "private, max-age=900" },
        }),
    );
    const response = await wrapped(req(), context);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toContain("Authorization");
  });
  it.each([
    [undefined, 50],
    ["abc", 50],
    ["0", 1],
    ["-3", 1],
    ["9999", 100],
    ["1.7", 1],
  ])("bounds list limit %s", (input, expected) => {
    expect(parseListLimit(input)).toBe(expected);
  });
  it("requires the CLI's exact loopback protocol, port and path", () => {
    expect(isCliCallback("http://localhost:9876/oauth/callback")).toBe(true);
    expect(isCliCallback("http://127.0.0.1:9876/oauth/callback")).toBe(true);
    for (const value of [
      "https://localhost:9876/oauth/callback",
      "http://localhost:7777/oauth/callback",
      "http://localhost:9876/other",
      "http://user@localhost:9876/oauth/callback",
      "http://localhost:9876/oauth/callback?x=y",
      "http://localhost:9876/oauth/callback#x",
      "file://localhost/oauth/callback",
      "http://evil.test:9876/oauth/callback",
    ])
      expect(isCliCallback(value)).toBe(false);
  });
  it("can enqueue the initial SSE snapshot before returning its readable response", async () => {
    const sse = createSSEResponse();
    await sse.send("snapshot", { conversations: [] });
    await sse.close();
    expect(await sse.response.text()).toContain("event: snapshot");
    expect(sse.response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("bypasses shared WEB cache for KJV and fails open on cache read outage", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            text: "test verse",
            reference: "John 3:16",
            translation_id: "kjv",
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      expect(
        (
          await verse(
            new NextRequest("https://example.test?ref=John.3.16&version=kjv"),
          )
        ).status,
      ).toBe(200);
      expect(mocks.fetchQuery).not.toHaveBeenCalled();
      expect(mocks.fetchMutation).not.toHaveBeenCalled();
      mocks.fetchQuery.mockRejectedValue(new Error("cache unavailable"));
      expect(
        (await verse(new NextRequest("https://example.test?ref=John.3.16")))
          .status,
      ).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
