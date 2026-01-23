import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHaptic } from "@/hooks/useHaptic";
import * as hapticLib from "@/lib/haptic";

// Mock the dependencies
vi.mock("@/hooks/useMobileDetect", () => ({
  useMobileDetect: vi.fn(() => ({ isTouchDevice: true, isMobile: false })),
}));

vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: vi.fn(() => true),
}));

vi.mock("@/lib/haptic", () => ({
  isHapticSupported: vi.fn(() => true),
  triggerHaptic: vi.fn(),
  HAPTIC_PATTERNS: {
    LIGHT: [10],
    MEDIUM: [20, 30, 20],
    HEAVY: [30, 50, 30],
    SUCCESS: [50, 30, 50],
    ERROR: [10, 50, 10, 50, 100],
  },
}));

describe("useHaptic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns haptic function and state", () => {
    const { result } = renderHook(() => useHaptic());

    expect(result.current.haptic).toBeDefined();
    expect(typeof result.current.haptic).toBe("function");
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isEnabled).toBe(true);
  });

  it("calls triggerHaptic with correct pattern when enabled", () => {
    const { result } = renderHook(() => useHaptic());

    result.current.haptic("MEDIUM");
    expect(hapticLib.triggerHaptic).toHaveBeenCalledWith("MEDIUM");

    result.current.haptic("SUCCESS");
    expect(hapticLib.triggerHaptic).toHaveBeenCalledWith("SUCCESS");
  });

  it("uses LIGHT as default pattern", () => {
    const { result } = renderHook(() => useHaptic());

    result.current.haptic();
    expect(hapticLib.triggerHaptic).toHaveBeenCalledWith("LIGHT");
  });

  it("does not trigger haptic when disabled in preferences", async () => {
    const { useUserPreference } = await import("@/hooks/useUserPreference");
    vi.mocked(useUserPreference).mockReturnValue(false);

    const { result } = renderHook(() => useHaptic());

    result.current.haptic("MEDIUM");
    expect(hapticLib.triggerHaptic).not.toHaveBeenCalled();
    expect(result.current.isEnabled).toBe(false);
  });

  it("does not trigger haptic on non-touch devices", async () => {
    const { useMobileDetect } = await import("@/hooks/useMobileDetect");
    vi.mocked(useMobileDetect).mockReturnValue({
      isTouchDevice: false,
      isMobile: false,
    });

    const { result } = renderHook(() => useHaptic());

    result.current.haptic("MEDIUM");
    expect(hapticLib.triggerHaptic).not.toHaveBeenCalled();
    expect(result.current.isEnabled).toBe(false);
  });

  it("reports isSupported based on browser capability", async () => {
    vi.mocked(hapticLib.isHapticSupported).mockReturnValue(false);

    const { result } = renderHook(() => useHaptic());
    expect(result.current.isSupported).toBe(false);
  });
});
