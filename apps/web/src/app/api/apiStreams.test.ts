/** @vitest-environment node */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  send: vi.fn(),
  sendError: vi.fn(),
  close: vi.fn(),
  poll: vi.fn(),
  auth: vi.fn(),
  client: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/api/convex", () => ({
  getAuthenticatedConvexClient: mocks.client,
}));
vi.mock("@/lib/api/sse/utils", () => ({
  createSSEResponse: () => ({
    response: new Response("stream"),
    send: mocks.send,
    sendError: mocks.sendError,
    close: mocks.close,
    isClosed: () => false,
  }),
  createPollingLoop: mocks.poll,
  createHeartbeatLoop: vi.fn(),
  setupSSECleanup: vi.fn(),
}));

import { GET as exportData } from "./export/route";
import { GET as conversations } from "./v1/conversations/stream/route";
import { GET as messages } from "./v1/messages/stream/[conversationId]/route";
import { GET as preferences } from "./v1/preferences/stream/route";

const context = { params: Promise.resolve({ conversationId: "conversation" }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    userId: "clerk-owner",
    getToken: vi.fn().mockResolvedValue("convex-token"),
  });
  mocks.client.mockReturnValue({ query: mocks.query });
});

describe("SSE identity and wire contracts", () => {
  it("formats conversation snapshots and updates and clamps the Convex query", async () => {
    mocks.query.mockResolvedValue([{ _id: "conversation", title: "owned" }]);
    await conversations(
      new NextRequest("https://example.test?limit=0"),
      context,
    );
    expect(mocks.query.mock.calls[0][1].limit).toBe(1);
    expect(mocks.send.mock.calls[0][1].conversations[0].sys.id).toBe(
      "conversation",
    );
    const update = await mocks.poll.mock.calls[0][0]();
    expect(update.conversations[0].data.title).toBe("owned");
  });
  it.each([
    "owned",
    "",
  ])("formats message content %j in snapshots and updates after ownership verification", async (content) => {
    mocks.query
      .mockResolvedValueOnce({ _id: "conversation" })
      .mockResolvedValue([{ _id: "message", content }]);
    await messages(new NextRequest("https://example.test"), context);
    expect(mocks.send.mock.calls[0][1].messages[0].sys.id).toBe("message");
    expect(mocks.send.mock.calls[0][1].messages[0].data.content).toBe(content);
    expect((await mocks.poll.mock.calls[0][0]()).messages[0].data.content).toBe(
      content,
    );
  });
  it("never emits successful null preferences before or after sync disappears", async () => {
    mocks.query.mockResolvedValue(null);
    expect(
      (await preferences(new NextRequest("https://example.test"), context))
        .status,
    ).toBe(500);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.sendError).toHaveBeenCalled();
    mocks.query
      .mockResolvedValueOnce({ theme: "dark" })
      .mockResolvedValue(null);
    await preferences(new NextRequest("https://example.test"), context);
    await expect(mocks.poll.mock.calls[0][0]()).rejects.toThrow(
      "User not found",
    );
  });
  it("authenticates export reads with the actual Convex token and rejects an unsynced user", async () => {
    mocks.query.mockResolvedValue(null);
    expect(
      (await exportData(new Request("https://example.test/api/export"))).status,
    ).toBe(404);
    expect(mocks.client).toHaveBeenCalledWith("convex-token");
    expect(mocks.query).toHaveBeenCalledTimes(1);
    mocks.auth.mockResolvedValue({ userId: null });
    expect(
      (await exportData(new Request("https://example.test/api/export"))).status,
    ).toBe(401);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
  it("normalizes token acquisition failures into private export errors", async () => {
    mocks.auth.mockResolvedValue({
      userId: "owner",
      getToken: vi.fn().mockRejectedValue(new Error("template unavailable")),
    });
    const response = await exportData(
      new Request("https://example.test/api/export"),
    );
    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await response.json()).status).toBe("error");
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
