import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlahChatCache, setActiveCache } from "@/lib/cache/db";
import { useSendMessage } from "@/lib/hooks/mutations/useSendMessage";
import { messageQueue } from "@/lib/offline/messageQueue";
import { ApiClientError, useApiClient } from "./client";

const auth = vi.hoisted(() => ({
  userId: "A" as string | null,
  sessionId: "session-A",
  isLoaded: true,
  getToken: vi.fn(async () => "token-A" as string | null),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ ...auth, getToken: () => auth.getToken() }),
}));
vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({}),
  useQueryClient: () => ({}),
}));
vi.mock("convex/react", () => ({ useQuery: () => ({ _id: "user-A" }) }));
vi.mock("@/lib/analytics", () => ({ analytics: { track: vi.fn() } }));
vi.mock("@/lib/offline/messageQueue", () => ({
  messageQueue: {
    getCount: vi.fn(async () => 0),
    processQueue: vi.fn(async () => "complete"),
  },
}));
vi.mock("@/lib/platform/desktopShell", () => ({
  getDesktopClientHeaders: () => ({ "X-Desktop-Client": "synthetic" }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  auth.userId = "A";
  auth.sessionId = "session-A";
  auth.isLoaded = true;
  auth.getToken.mockResolvedValue("token-A");
  setActiveCache(new BlahChatCache("A"));
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ status: "success", data: { ok: true } }),
          { status: 200 },
        ),
    ),
  );
});
afterEach(() => {
  setActiveCache(null);
  vi.unstubAllGlobals();
});

describe("session-bound API client", () => {
  it("stays stable across rerenders and uses the latest same-session token getter", async () => {
    const hook = renderHook(() => useApiClient());
    const original = hook.result.current;
    auth.getToken.mockResolvedValue("refreshed-A");
    hook.rerender();
    expect(hook.result.current).toBe(original);
    await expect(
      original.post("/synthetic", { content: "test" }),
    ).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "/synthetic",
      expect.objectContaining({
        method: "POST",
        body: '{"content":"test"}',
        headers: expect.objectContaining({
          Authorization: "Bearer refreshed-A",
          "Content-Type": "application/json",
          "X-Desktop-Client": "synthetic",
        }),
      }),
    );
  });

  it.each([
    "loading",
    "switch",
  ])("does not fetch with a token returned after identity %s", async (change) => {
    let resolve!: (token: string) => void;
    auth.getToken.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const hook = renderHook(() => useApiClient());
    const request = hook.result.current.post("/synthetic", {});
    const rejection = expect(request).rejects.toBeInstanceOf(ApiClientError);
    if (change === "loading") auth.isLoaded = false;
    else {
      auth.userId = "B";
      auth.sessionId = "session-B";
    }
    hook.rerender();
    resolve("late-token");
    await rejection;
    expect(fetch).not.toHaveBeenCalled();
    if (change === "switch") {
      auth.getToken.mockResolvedValue("token-B");
      await hook.result.current.get("/synthetic");
      expect(fetch).toHaveBeenCalledWith(
        "/synthetic",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer token-B" }),
        }),
      );
    }
  });

  it.each([
    "same-owner",
    "loading",
    "switch",
  ])("handles rerender during offline count lookup: %s", async (change) => {
    let resolve!: (count: number) => void;
    vi.mocked(messageQueue.getCount).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const hook = renderHook(() => useSendMessage());
    act(() => window.dispatchEvent(new Event("online")));
    if (change === "loading") {
      auth.isLoaded = false;
      setActiveCache(null);
    }
    if (change === "switch") {
      auth.userId = "B";
      auth.sessionId = "session-B";
      setActiveCache(new BlahChatCache("B"));
    }
    hook.rerender();
    await act(async () => resolve(1));
    if (change === "same-owner")
      await waitFor(() =>
        expect(messageQueue.processQueue).toHaveBeenCalledTimes(1),
      );
    else expect(messageQueue.processQueue).not.toHaveBeenCalled();
  });

  it("rejects a pending token when cache consumers unmount during identity resolution", async () => {
    let resolve!: (token: string) => void;
    auth.getToken.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const hook = renderHook(() => useApiClient());
    const pending = hook.result.current.post("/synthetic", {});
    const rejected = expect(pending).rejects.toBeInstanceOf(ApiClientError);
    hook.unmount();
    resolve("token-for-new-identity");
    await rejected;
    expect(fetch).not.toHaveBeenCalled();
  });
});
