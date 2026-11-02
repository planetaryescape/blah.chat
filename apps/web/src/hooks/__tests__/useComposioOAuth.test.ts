import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  initiate: vi.fn(),
  open: vi.fn(),
}));
vi.mock("convex/react", () => ({
  useAction: () => mocks.initiate,
  useQuery: () => [],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useComposioOAuth } from "../useComposioOAuth";

const state = "a".repeat(64);
const realWindow = window;
function origin(url: string) {
  vi.stubGlobal(
    "window",
    new Proxy(realWindow, {
      get(target, property) {
        if (property === "location") return new URL(url);
        if (property === "open") return mocks.open;
        if (
          property === "addEventListener" ||
          property === "removeEventListener"
        )
          return target[property].bind(target);
        return Reflect.get(target, property, target);
      },
    }),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  origin("https://blah.chat");
  mocks.initiate.mockResolvedValue({
    state,
    redirectUrl: "https://provider.example.test/oauth",
  });
  mocks.open.mockReturnValue({ focus: vi.fn(), close: vi.fn(), closed: false });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Composio OAuth transport", () => {
  it.each([
    "https://blah.chat",
    "https://localhost:3000",
  ])("always creates and expires a Secure SameSite cookie at %s", async (url) => {
    origin(url);
    const cookie = vi.spyOn(document, "cookie", "set");
    const { result } = renderHook(() => useComposioOAuth());
    await act(() => result.current.connect("github"));
    expect(mocks.initiate).toHaveBeenCalledWith({
      integrationId: "github",
      redirectUrl: `${url}/api/composio/callback`,
    });
    expect(cookie.mock.calls[0][0]).toContain(`composio_oauth_state=${state};`);
    expect(cookie.mock.calls[0][0]).toMatch(/; Secure(?:;|$)/);
    expect(cookie.mock.calls[0][0]).toContain("SameSite=Lax");
    act(() =>
      realWindow.dispatchEvent(
        new MessageEvent("message", {
          origin: url,
          data: { type: "composio-oauth-callback", success: true },
        }),
      ),
    );
    const deletion = cookie.mock.calls[1][0];
    expect(deletion).toContain("expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(deletion).toContain("Secure");
    expect(deletion).toContain("SameSite=Lax");
  });
  it.each([
    "http://untrusted.example.test",
    "http://localhost:3000",
  ])("refuses insecure initialization before backend state creation at %s", async (url) => {
    origin(url);
    const cookie = vi.spyOn(document, "cookie", "set");
    const { result } = renderHook(() => useComposioOAuth());
    await act(() => result.current.connect("github"));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("HTTPS");
    expect(mocks.initiate).not.toHaveBeenCalled();
    expect(mocks.open).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
  });
  it("ignores foreign-origin callback messages", async () => {
    const cookie = vi.spyOn(document, "cookie", "set");
    const { result } = renderHook(() => useComposioOAuth());
    await act(() => result.current.connect("github"));
    act(() =>
      realWindow.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://foreign.example.test",
          data: { type: "composio-oauth-callback", success: true },
        }),
      ),
    );
    expect(result.current.status).toBe("connecting");
    expect(cookie).toHaveBeenCalledTimes(1);
  });
  it("rejects unexpected state characters before writing a cookie or opening the provider", async () => {
    mocks.initiate.mockResolvedValue({
      state: "bad; Secure=false",
      redirectUrl: "https://provider.example.test/oauth",
    });
    const cookie = vi.spyOn(document, "cookie", "set");
    const { result } = renderHook(() => useComposioOAuth());
    await act(() => result.current.connect("github"));
    expect(result.current.status).toBe("error");
    expect(cookie).not.toHaveBeenCalled();
    expect(mocks.open).not.toHaveBeenCalled();
  });
});
