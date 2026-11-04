import { prepareDeterministic } from "@blah-chat/backend/convex/lib/speech/prepare";
import type {
  PreparedNarration,
  SpeechSegment,
} from "@blah-chat/backend/convex/lib/speech/types";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import type { FunctionReference } from "convex/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TTSButton } from "@/components/chat/TTSButton";
import { TTSPlayerBar } from "@/components/chat/TTSPlayerBar";
import { TTSProvider, useTTSPlayer } from "./TTSContext";

interface TestAuth {
  userId: string | null | undefined;
  isLoaded: boolean;
}

const mocks = vi.hoisted(() => {
  const auth: TestAuth = {
    userId: "owner",
    isLoaded: true,
  };
  return {
    getToken: vi.fn(),
    prepare: vi.fn(),
    cancel: vi.fn(),
    fetch: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    track: vi.fn(),
    createObjectURL: vi.fn(() => "blob:uninitialized"),
    revokeObjectURL: vi.fn(),
    auth,
  };
});
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ ...mocks.auth, getToken: mocks.getToken }),
}));
vi.mock("convex/react", () => ({ useAction: () => mocks.prepare }));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    token = "";
    setAuth(token: string) {
      this.token = token;
    }
    mutation(
      _reference: FunctionReference<"mutation">,
      args: { requestId: string },
    ) {
      return mocks.cancel(args, this.token);
    }
  },
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.error, warning: mocks.warning, info: mocks.info },
}));
vi.mock("@/lib/analytics", () => ({ analytics: { track: mocks.track } }));
vi.mock("@/lib/hooks/useApiKeyValidation", () => ({
  useApiKeyValidation: () => ({
    byok: { enabled: false },
    getTTSErrorMessage: () => "",
  }),
}));

class MockAudio {
  static instances: MockAudio[] = [];
  static playImplementation: () => Promise<void> = () => Promise.resolve();
  src = "";
  duration = 2;
  currentTime = 0;
  playbackRate = 1;
  preservesPitch = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  onloadedmetadata: (() => void) | null = null;
  play = vi.fn(() => MockAudio.playImplementation());
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  constructor() {
    MockAudio.instances.push(this);
  }
}

function segment(id: string, pauseAfterMs = 200): SpeechSegment {
  return {
    id,
    blockId: `block-${id}`,
    kind: id === "heading" ? "heading" : "paragraph",
    role: "source",
    text: `Prepared ${id}`,
    pauseAfterMs,
    sourceStart: 0,
    sourceEnd: 10,
  };
}
function narration(
  segments = [segment("heading", 450), segment("body"), segment("ending")],
): PreparedNarration {
  return {
    version: "1",
    sourceHash: "revision",
    segments,
    coverage: "complete",
    warnings: [],
    modelAssisted: false,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function flush() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}
function setup() {
  return renderHook(() => useTTSPlayer(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <TTSProvider defaultVoice="voice-a" defaultSpeed={1.25}>
        {children}
      </TTSProvider>
    ),
  });
}
function speak(
  result: ReturnType<typeof setup>["result"],
  text = "# Original\n\nPrivate **message**",
  messageId = "message-a",
) {
  act(() => {
    void result.current.playFromText({ text, messageId });
  });
}
async function endAudio(index: number, gap: number) {
  act(() => {
    if (!Number.isInteger(index) || index < 0)
      throw new Error(`Invalid audio fixture index ${index}`);
    const audio = MockAudio.instances.at(index);
    if (!audio) throw new Error(`Expected audio fixture ${index}`);
    audio.onended?.();
  });
  await flush();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(gap);
  });
  await flush();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.auth.userId = "owner";
  mocks.auth.isLoaded = true;
  mocks.getToken.mockResolvedValue("user-convex-jwt");
  mocks.prepare.mockResolvedValue(narration());
  mocks.cancel.mockResolvedValue(null);
  mocks.fetch.mockImplementation(() =>
    Promise.resolve(new Response(new Blob(["audio"], { type: "audio/mpeg" }))),
  );
  MockAudio.instances = [];
  MockAudio.playImplementation = () => Promise.resolve();
  mocks.createObjectURL.mockImplementation(
    () => `blob:${MockAudio.instances.length}`,
  );
  vi.stubGlobal("Audio", MockAudio);
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = mocks.createObjectURL;
      static revokeObjectURL = mocks.revokeObjectURL;
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("prepared private narration", () => {
  it("hands real list preparation to sequential POST playback without labels", async () => {
    const source =
      "- First\n  - Child says list item literally.\n- Second\n\n7. Seventh\n8. Eighth\n\n- [x] Checked\n- [ ] Unchecked\n\nFinal sentence.";
    const { narration: prepared } = await prepareDeterministic(source);
    mocks.prepare.mockResolvedValue(prepared);
    const { result } = setup();
    speak(result, source);
    await flush();

    expect(prepared.version).toBe("2");
    const bodies = () =>
      mocks.fetch.mock.calls.map(([, init]) => JSON.parse(init.body).text);
    expect(bodies()).toEqual(["First"]);
    expect(MockAudio.instances).toHaveLength(1);
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toMatchObject({
      text: "First",
      voice: "voice-a",
      speed: 1,
    });

    for (let index = 0; index < prepared.segments.length; index++) {
      await endAudio(index, prepared.segments[index].pauseAfterMs);
      if (index + 1 < prepared.segments.length) {
        expect(bodies()).toHaveLength(index + 2);
        expect(bodies()[index + 1]).toBe(prepared.segments[index + 1].text);
      }
    }

    expect(bodies()).toEqual(prepared.segments.map((segment) => segment.text));
    expect(bodies().slice(0, 3)).toEqual([
      "First",
      "Child says list item literally.",
      "Second",
    ]);
    expect(bodies()).toContain("Child says list item literally.");
    expect(bodies().join("")).toContain("7. Seventh");
    expect(bodies().join("")).toContain("8. Eighth");
    expect(bodies().join("")).toContain("Checked. Checked");
    expect(bodies().join("")).toContain("Unchecked. Unchecked");
    expect(bodies().at(-1)).toBe("Final sentence.");
    expect(
      bodies().some((text) =>
        /^(?:List item|Item \d+|Nested list level)/.test(text),
      ),
    ).toBe(false);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("prepares original Markdown before JWT-only POST audio and retains source mapping", async () => {
    const prepare = deferred<PreparedNarration>();
    mocks.prepare.mockReturnValue(prepare.promise);
    const { result } = setup();
    speak(result);
    await flush();
    expect(result.current.state.isPreparing).toBe(true);
    expect(mocks.prepare).toHaveBeenCalledWith({
      text: "# Original\n\nPrivate **message**",
      messageId: "message-a",
      requestId: expect.any(String),
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
    prepare.resolve(narration());
    await flush();
    expect(mocks.getToken).toHaveBeenCalledWith({ template: "convex" });
    const [url, init] = mocks.fetch.mock.calls[0];
    expect(new URL(url).search).toBe("");
    expect(url).not.toMatch(/Private|Prepared|jwt|voice-a/);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer user-convex-jwt");
    expect(JSON.parse(init.body)).toEqual({
      text: "Prepared heading",
      voice: "voice-a",
      speed: 1,
    });
    expect(result.current.state.activeSegment).toEqual(segment("heading", 450));
    expect(result.current.state.sourceHash).toBe("revision");
  });

  it.each([
    null,
    "",
  ])("makes no paid preparation or synthesis call without a JWT (%s)", async (token) => {
    mocks.getToken.mockResolvedValue(token);
    const { result } = setup();
    speak(result);
    await flush();
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
    expect(result.current.state.canResume).toBe(false);
  });

  it.each([
    "logged-out",
    "loading",
  ])("does not pay when identity is %s", async (mode) => {
    mocks.auth.userId = null;
    mocks.auth.isLoaded = mode !== "loading";
    const { result } = setup();
    speak(result);
    await flush();
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("discloses partial coverage before speech", async () => {
    mocks.prepare.mockResolvedValue({
      ...narration(),
      coverage: "partial",
      warnings: ["Missing image"],
    });
    const { result } = setup();
    speak(result);
    await flush();
    expect(result.current.state.warning).toContain("Partial narration");
    expect(result.current.state.warning).toContain("Missing image");
    expect(mocks.warning).toHaveBeenCalled();
  });

  it("preparation failure is visible and does not synthesize", async () => {
    mocks.prepare.mockRejectedValue(new Error("Preparation unavailable"));
    const { result } = setup();
    speak(result);
    await flush();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("Preparation unavailable");
    expect(result.current.state.isLoading).toBe(false);
  });

  it("middle synthesis failure stops and never requests the final paragraph or completes", async () => {
    mocks.fetch
      .mockResolvedValueOnce(new Response("audio"))
      .mockResolvedValueOnce(new Response("denied", { status: 401 }));
    const { result } = setup();
    speak(result);
    await flush();
    await endAudio(0, 450);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(MockAudio.instances).toHaveLength(1);
    expect(result.current.state.canResume).toBe(false);
    expect(result.current.state.isStreaming).toBe(false);
    expect(mocks.error).toHaveBeenCalledWith(
      expect.stringContaining("without skipping"),
    );
    expect(mocks.track).not.toHaveBeenCalledWith(
      "tts_playback_completed",
      expect.anything(),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100_000);
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("uses actual ended events and heading gaps, one owned Blob at a time", async () => {
    const { result } = setup();
    speak(result);
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100_000);
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.canResume).toBe(true);
    expect(mocks.track).not.toHaveBeenCalledWith(
      "tts_playback_completed",
      expect.anything(),
    );
    act(() => {
      MockAudio.instances[0].onended?.();
    });
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(449);
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await flush();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.revokeObjectURL).toHaveBeenCalledTimes(1);
    await endAudio(1, 200);
    expect(result.current.state.activeSegment?.id).toBe("ending");
    expect(
      mocks.fetch.mock.calls.map(([, init]) => JSON.parse(init.body).text),
    ).toEqual(["Prepared heading", "Prepared body", "Prepared ending"]);
    await endAudio(2, 200);
    expect(mocks.track).toHaveBeenCalledWith(
      "tts_playback_completed",
      expect.anything(),
    );
    expect(mocks.revokeObjectURL).toHaveBeenCalledTimes(3);
    expect(result.current.state.canResume).toBe(false);
  });

  it("pauses the remaining semantic gap without auto-resume", async () => {
    const { result } = setup();
    speak(result);
    await flush();
    act(() => {
      MockAudio.instances[0].onended?.();
    });
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    act(() => {
      result.current.pause();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await result.current.resume();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(349);
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await flush();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("pause during a fetch prevents newly loaded audio from starting", async () => {
    const response = deferred<Response>();
    mocks.fetch.mockReturnValue(response.promise);
    const { result } = setup();
    speak(result);
    await flush();
    act(() => {
      result.current.pause();
    });
    response.resolve(new Response("audio"));
    await flush();
    expect(MockAudio.instances[0].play).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.resume();
    });
    expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(1);
  });

  it("rejects seeks across unknown sections rather than silently skipping them", async () => {
    const { result } = setup();
    speak(result);
    await flush();
    act(() => {
      result.current.seekTo(100);
    });
    expect(MockAudio.instances[0].currentTime).toBe(0);
    expect(mocks.info).toHaveBeenCalledWith(
      expect.stringContaining("current loaded section"),
    );
    act(() => {
      result.current.seekTo(1);
    });
    expect(MockAudio.instances[0].currentTime).toBe(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("visible unsupported browser failure cannot silently omit audio", async () => {
    vi.stubGlobal("Audio", undefined);
    const { result } = setup();
    speak(result);
    await flush();
    expect(mocks.error).toHaveBeenCalledWith(
      expect.stringContaining("does not support"),
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(result.current.state.isLoading).toBe(false);
  });
});

describe("session cancellation", () => {
  it("cancels only the replaced preparation request using its captured owner JWT", async () => {
    const pending = deferred<PreparedNarration>();
    mocks.prepare.mockReturnValueOnce(pending.promise);
    const { result, rerender } = setup();
    speak(result, "A", "a");
    await flush();
    const oldId = mocks.prepare.mock.calls[0][0].requestId;
    speak(result, "B", "b");
    await flush();
    const newId = mocks.prepare.mock.calls[1][0].requestId;
    expect(newId).not.toBe(oldId);
    expect(mocks.cancel).toHaveBeenCalledWith(
      { requestId: oldId },
      "user-convex-jwt",
    );
    pending.resolve(narration());
    await flush();
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    mocks.getToken.mockResolvedValue("other-account-jwt");
    mocks.auth.userId = "other";
    mocks.cancel.mockRejectedValue(new Error("Offline"));
    act(() => {
      rerender();
    });
    await flush();
    expect(mocks.cancel).toHaveBeenLastCalledWith(
      { requestId: newId },
      "user-convex-jwt",
    );
    expect(mocks.error).not.toHaveBeenCalled();
  });
  it("delayed token acquisition after stop cannot trigger paid preparation", async () => {
    const token = deferred<string>();
    mocks.getToken.mockReturnValue(token.promise);
    const { result } = setup();
    speak(result);
    act(() => {
      result.current.stop();
    });
    token.resolve("late-jwt");
    await flush();
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("a late Blob from A cannot append to B", async () => {
    const blob = deferred<Blob>();
    mocks.fetch.mockResolvedValueOnce({ ok: true, blob: () => blob.promise });
    const { result } = setup();
    speak(result, "A", "a");
    await flush();
    speak(result, "B", "b");
    await flush();
    const liveSegment = result.current.state.activeSegment;
    blob.resolve(new Blob(["late"]));
    await flush();
    expect(MockAudio.instances).toHaveLength(1);
    expect(result.current.state.sourceMessageId).toBe("b");
    expect(result.current.state.activeSegment).toBe(liveSegment);
    expect(mocks.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("stop while browser play is pending prevents a late play promise from reviving audio", async () => {
    const playing = deferred<undefined>();
    MockAudio.playImplementation = () => playing.promise;
    const { result } = setup();
    speak(result);
    await flush();
    const audio = MockAudio.instances[0];
    act(() => {
      result.current.stop();
    });
    playing.resolve(undefined);
    await flush();
    expect(audio.pause).toHaveBeenCalledTimes(2);
    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.state.canResume).toBe(false);
    expect(mocks.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("late preparation A cannot replace playback B", async () => {
    const first = deferred<PreparedNarration>();
    mocks.prepare
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(narration([segment("B")]));
    const { result } = setup();
    speak(result, "A", "a");
    await flush();
    speak(result, "B", "b");
    await flush();
    first.resolve(narration([segment("A")]));
    await flush();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.activeSegment?.id).toBe("B");
    expect(result.current.state.sourceMessageId).toBe("b");
  });

  it.each([
    "stop",
    "close",
    "unmount",
    "logout",
    "switch",
    "loading",
  ])("%s cancels in-flight fetch and rejects its late result", async (operation) => {
    const response = deferred<Response>();
    mocks.fetch.mockReturnValue(response.promise);
    const { result, rerender, unmount } = setup();
    speak(result);
    await flush();
    const signal = mocks.fetch.mock.calls[0][1].signal;
    act(() => {
      if (operation === "stop") result.current.stop();
      else if (operation === "close") result.current.close();
      else if (operation === "unmount") unmount();
      else {
        mocks.auth.userId = operation === "switch" ? "other" : null;
        mocks.auth.isLoaded = operation !== "loading";
        rerender();
      }
    });
    expect(signal.aborted).toBe(true);
    expect(mocks.cancel).toHaveBeenCalledWith(
      { requestId: mocks.prepare.mock.calls[0][0].requestId },
      "user-convex-jwt",
    );
    expect(vi.getTimerCount()).toBe(0);
    response.resolve(new Response("late audio"));
    await flush();
    expect(mocks.createObjectURL).not.toHaveBeenCalled();
    expect(MockAudio.instances).toHaveLength(0);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("stop during preparation never starts a stream", async () => {
    const prepare = deferred<PreparedNarration>();
    mocks.prepare.mockReturnValue(prepare.promise);
    const { result } = setup();
    speak(result);
    await flush();
    act(() => {
      result.current.stop();
    });
    prepare.resolve(narration());
    await flush();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(result.current.state.isLoading).toBe(false);
    expect(mocks.cancel).toHaveBeenCalledWith(
      { requestId: mocks.prepare.mock.calls[0][0].requestId },
      "user-convex-jwt",
    );
  });

  it("stop during a gap clears timers; stale ended events cannot resurrect playback", async () => {
    const { result } = setup();
    speak(result);
    await flush();
    const oldEnded = MockAudio.instances[0].onended;
    act(() => {
      oldEnded?.();
    });
    await flush();
    act(() => {
      result.current.stop();
    });
    act(() => {
      oldEnded?.();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(mocks.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("unmount revokes owned audio and nulls listeners", async () => {
    const { result, unmount } = setup();
    speak(result);
    await flush();
    const audio = MockAudio.instances[0];
    unmount();
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.onended).toBeNull();
    expect(audio.onerror).toBeNull();
    expect(mocks.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});

describe("failure and controls", () => {
  it("offers a visible busy Retry without automatic duplicate synthesis or cross-account retry", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("busy", { status: 409 }));
    function Begin() {
      const { playFromText } = useTTSPlayer();
      return (
        <button
          type="button"
          onClick={() => void playFromText({ text: "Source" })}
        >
          Begin
        </button>
      );
    }
    const { rerender } = render(
      <TTSProvider>
        <Begin />
        <TTSPlayerBar />
      </TTSProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Begin" }));
    await flush();
    const retry = screen.getByRole("button", { name: "Retry narration" });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(retry);
    await flush();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.prepare.mock.calls[1][0].requestId).not.toBe(
      mocks.prepare.mock.calls[0][0].requestId,
    );
    mocks.auth.userId = "other";
    rerender(
      <TTSProvider>
        <Begin />
        <TTSPlayerBar />
      </TTSProvider>,
    );
    await flush();
    expect(
      screen.queryByRole("button", { name: "Retry narration" }),
    ).toBeNull();
  });
  it("hides section zero while loading, then exposes an accessible gesture-bound Resume", async () => {
    const response = deferred<Response>();
    mocks.fetch.mockReturnValue(response.promise);
    MockAudio.playImplementation = () =>
      Promise.reject(new DOMException("Gesture required", "NotAllowedError"));
    function Begin() {
      const { playFromText } = useTTSPlayer();
      return (
        <button
          type="button"
          onClick={() => void playFromText({ text: "Source" })}
        >
          Begin
        </button>
      );
    }
    render(
      <TTSProvider>
        <Begin />
        <TTSPlayerBar />
      </TTSProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Begin" }));
    await flush();
    expect(screen.queryByText(/Section 0/)).toBeNull();
    expect(screen.queryByText(/Section \d+ of/)).toBeNull();
    response.resolve(new Response("audio"));
    await flush();
    expect(screen.getByText(/Section 1 of 3/)).toBeTruthy();
    const resume = screen.getByRole("button", { name: "Resume narration" });
    expect(
      screen.getByText("Paused. Choose Resume to play this section."),
    ).toBeTruthy();
    expect(resume).not.toBeDisabled();
    MockAudio.playImplementation = () => Promise.resolve();
    fireEvent.click(resume);
    expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(2);
    await flush();
  });
  it("retains autoplay-denied audio for an immediate explicit Resume gesture", async () => {
    MockAudio.playImplementation = () =>
      Promise.reject(new DOMException("Gesture required", "NotAllowedError"));
    const { result } = setup();
    speak(result);
    await flush();
    const audio = MockAudio.instances[0];
    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.state.canResume).toBe(true);
    expect(result.current.state.isLoading).toBe(false);
    expect(mocks.revokeObjectURL).not.toHaveBeenCalled();
    expect(audio.removeAttribute).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
    MockAudio.playImplementation = () => Promise.resolve();
    act(() => {
      void result.current.resume();
      expect(audio.play).toHaveBeenCalledTimes(2);
    });
    await flush();
    expect(result.current.state.isPlaying).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("advances gap progress, freezes on pause, and clears all progress work on Stop", async () => {
    const { result } = setup();
    speak(result);
    await flush();
    act(() => {
      MockAudio.instances[0].onended?.();
    });
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(result.current.state.currentTime).toBeCloseTo(2.1, 6);
    act(() => {
      result.current.pause();
    });
    const paused = result.current.state.currentTime;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.state.currentTime).toBe(paused);
    act(() => {
      void result.current.resume();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(result.current.state.currentTime).toBeCloseTo(2.2, 6);
    act(() => {
      result.current.stop();
    });
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.currentTime).toBe(0);
  });
  it("an older play rejection cannot stop a newer explicit resume", async () => {
    const oldPlay = deferred<undefined>();
    MockAudio.playImplementation = vi
      .fn()
      .mockReturnValueOnce(oldPlay.promise)
      .mockResolvedValue(undefined);
    const { result } = setup();
    speak(result);
    await flush();
    act(() => {
      result.current.pause();
    });
    await act(async () => {
      await result.current.resume();
    });
    oldPlay.reject(new DOMException("Interrupted", "AbortError"));
    await flush();
    expect(result.current.state.canResume).toBe(true);
    expect(result.current.state.isPlaying).toBe(true);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("a deliberate pause while play is pending is not treated as an audio failure", async () => {
    const playing = deferred<undefined>();
    MockAudio.playImplementation = () => playing.promise;
    const { result } = setup();
    speak(result);
    await flush();
    act(() => {
      result.current.pause();
    });
    playing.reject(new DOMException("Interrupted by pause", "AbortError"));
    await flush();
    expect(result.current.state.canResume).toBe(true);
    expect(result.current.state.isPlaying).toBe(false);
    expect(mocks.error).not.toHaveBeenCalled();
    MockAudio.playImplementation = () => Promise.resolve();
    await act(async () => {
      await result.current.resume();
    });
    expect(result.current.state.isPlaying).toBe(true);
  });

  it.each([
    "empty",
    "network",
    "decoder",
    "play",
  ])("%s failure discloses and stops without completion", async (mode) => {
    if (mode === "empty") mocks.fetch.mockResolvedValue(new Response(""));
    if (mode === "network") mocks.fetch.mockRejectedValue(new Error("Offline"));
    if (mode === "play")
      MockAudio.playImplementation = () => Promise.reject(new Error("Blocked"));
    const { result } = setup();
    speak(result);
    await flush();
    if (mode === "decoder") {
      act(() => {
        MockAudio.instances[0].onerror?.();
      });
      await flush();
    }
    expect(mocks.error).toHaveBeenCalledTimes(1);
    expect(result.current.state.canResume).toBe(false);
    expect(result.current.state.isStreaming).toBe(false);
    expect(mocks.track).not.toHaveBeenCalledWith(
      "tts_playback_completed",
      expect.anything(),
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("request timeout aborts and discloses once without retry", async () => {
    mocks.fetch.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener(
            "abort",
            () => {
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        }),
    );
    const { result } = setup();
    speak(result);
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000);
    });
    expect(mocks.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(mocks.error).toHaveBeenCalledWith(
      expect.stringContaining("timed out"),
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.canResume).toBe(false);
  });

  it("refreshes JWT per segment but never synthesizes after a missing refreshed token", async () => {
    mocks.getToken
      .mockResolvedValueOnce("initial")
      .mockResolvedValueOnce("audio-1")
      .mockResolvedValueOnce(null);
    const { result } = setup();
    speak(result);
    await flush();
    expect(mocks.fetch.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer audio-1",
    );
    await endAudio(0, 450);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.error).toHaveBeenCalledWith(
      expect.stringContaining("authenticated session"),
    );
  });

  it("pause/resume controls actual audio and speed changes never alter snapshotted synthesis options", async () => {
    const { result } = setup();
    speak(result);
    await flush();
    const audio = MockAudio.instances[0];
    act(() => {
      result.current.pause();
    });
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(result.current.state.isPlaying).toBe(false);
    act(() => {
      result.current.setSpeed(2);
    });
    expect(audio.playbackRate).toBe(2);
    await act(async () => {
      await result.current.resume();
    });
    expect(audio.play).toHaveBeenCalledTimes(2);
    await endAudio(0, 450);
    expect(MockAudio.instances[1].playbackRate).toBe(2);
    expect(JSON.parse(mocks.fetch.mock.calls[1][1].body).speed).toBe(1);
  });

  it("source mapping survives one block with multiple detail segments", async () => {
    const first = {
      ...segment("cell-1", 0),
      blockId: "table",
      kind: "table",
      role: "detail",
    } satisfies SpeechSegment;
    const second = { ...first, id: "cell-2", sourceStart: 10, sourceEnd: 20 };
    mocks.prepare.mockResolvedValue(narration([first, second]));
    const { result } = setup();
    speak(result);
    await flush();
    expect(result.current.state.activeSegment).toEqual(first);
    await endAudio(0, 0);
    expect(result.current.state.activeSegment).toEqual(second);
  });

  it("same-message Speak can restart loading and failed sessions", async () => {
    const first = deferred<PreparedNarration>();
    mocks.prepare
      .mockReturnValueOnce(first.promise)
      .mockRejectedValueOnce(new Error("Failed"));
    render(
      <TTSProvider>
        <TTSButton text="Original" messageId="a" />
      </TTSProvider>,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    await flush();
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    await flush();
    expect(mocks.prepare).toHaveBeenCalledTimes(2);
    fireEvent.click(button);
    await flush();
    expect(mocks.prepare).toHaveBeenCalledTimes(3);
    expect(MockAudio.instances).toHaveLength(1);
    first.resolve(narration());
    await flush();
    expect(MockAudio.instances).toHaveLength(1);
  });

  it.each([
    "stopped",
    "completed",
  ])("same-message Speak restarts a %s session instead of resuming empty audio", async (mode) => {
    mocks.prepare.mockResolvedValue(narration([segment("only", 0)]));
    function StopButton() {
      const { stop } = useTTSPlayer();
      return (
        <button type="button" onClick={stop}>
          Stop playback
        </button>
      );
    }
    render(
      <TTSProvider>
        <TTSButton text="Original" messageId="a" />
        <StopButton />
      </TTSProvider>,
    );
    const speakButton = screen.getByRole("button", { name: "Play" });
    fireEvent.click(speakButton);
    await flush();
    if (mode === "stopped")
      fireEvent.click(screen.getByRole("button", { name: "Stop playback" }));
    else await endAudio(0, 0);
    await flush();
    fireEvent.click(speakButton);
    await flush();
    expect(mocks.prepare).toHaveBeenCalledTimes(2);
    expect(MockAudio.instances).toHaveLength(2);
    expect(MockAudio.instances[1].play).toHaveBeenCalledTimes(1);
  });
});
