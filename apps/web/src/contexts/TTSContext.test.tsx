import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TTSProvider, useTTSPlayer } from "./TTSContext";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  fetch: vi.fn(),
  player: {
    setSpeed: vi.fn(() => 1),
    initializeAudio: vi.fn(async () => ({})),
    cleanupAudio: vi.fn(),
    isAborted: vi.fn(() => false),
    speedRef: { current: 1 },
    getAbortSignal: vi.fn(() => new AbortController().signal),
    appendBuffer: vi.fn(),
    play: vi.fn(),
    endStream: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    seekBy: vi.fn(),
    seekTo: vi.fn(),
  },
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: mocks.getToken }),
}));
vi.mock("@/hooks/useTTSAudioPlayer", () => ({
  useTTSAudioPlayer: () => mocks.player,
}));
vi.mock("@/lib/analytics", () => ({ analytics: { track: vi.fn() } }));

function Player() {
  const { playFromText } = useTTSPlayer();
  return (
    <button type="button" onClick={() => void playFromText({ text: "Hello" })}>
      Speak
    </button>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getToken.mockResolvedValue("user-convex-jwt");
  mocks.fetch.mockImplementation(async () => new Response("audio"));
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());

describe("authenticated speech requests", () => {
  it("requests a Convex JWT and sends it only as the bearer header", async () => {
    render(
      <TTSProvider>
        <Player />
      </TTSProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    expect(mocks.getToken).toHaveBeenCalledWith({ template: "convex" });
    const [url, init] = mocks.fetch.mock.calls[0];
    expect(url).not.toContain("user-convex-jwt");
    expect(init.headers.Authorization).toBe("Bearer user-convex-jwt");
  });
  it("does not call paid speech without a token", async () => {
    mocks.getToken.mockResolvedValue(null);
    render(
      <TTSProvider>
        <Player />
      </TTSProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    await waitFor(() => expect(mocks.player.cleanupAudio).toHaveBeenCalled());
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
