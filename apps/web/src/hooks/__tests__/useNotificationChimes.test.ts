import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationChimes } from "@/hooks/useNotificationChimes";
import { playNotificationChime } from "@/lib/audio/notificationChimes";

const mockUseUserPreference = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: mockUseUserPreference,
}));

vi.mock("@/lib/audio/notificationChimes", async () => {
  const actual = await vi.importActual("@/lib/audio/notificationChimes");
  return {
    ...actual,
    playNotificationChime: vi.fn(),
  };
});

const sounds = {
  emailReceived: "arrival",
  emailSent: "sent",
  emailArchived: "archive",
  messageSent: "sent",
  conversationArchived: "archive",
  notification: "notify",
} as const;

describe("useNotificationChimes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserPreference.mockImplementation((key: string) => {
      if (key === "notificationChimesEnabled") {
        return true;
      }
      if (key === "notificationChimeSounds") {
        return sounds;
      }
      return undefined;
    });
  });

  it("plays the configured chime for an action when notification chimes are enabled", () => {
    const { result } = renderHook(() => useNotificationChimes());

    result.current.play("emailArchived");

    expect(playNotificationChime).toHaveBeenCalledWith("archive");
  });

  it("does not play when notification chimes are disabled", () => {
    mockUseUserPreference.mockImplementation((key: string) =>
      key === "notificationChimesEnabled" ? false : sounds,
    );
    const { result } = renderHook(() => useNotificationChimes());

    result.current.play("emailSent");

    expect(playNotificationChime).not.toHaveBeenCalled();
  });
});
