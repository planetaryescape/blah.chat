import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HAPTIC_PATTERNS,
  isHapticSupported,
  triggerHaptic,
} from "@/lib/haptic";

describe("haptic", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
  });

  describe("HAPTIC_PATTERNS", () => {
    it("defines expected patterns", () => {
      expect(HAPTIC_PATTERNS.LIGHT).toEqual([10]);
      expect(HAPTIC_PATTERNS.MEDIUM).toEqual([20, 30, 20]);
      expect(HAPTIC_PATTERNS.HEAVY).toEqual([30, 50, 30]);
      expect(HAPTIC_PATTERNS.SUCCESS).toEqual([50, 30, 50]);
      expect(HAPTIC_PATTERNS.ERROR).toEqual([10, 50, 10, 50, 100]);
    });
  });

  describe("isHapticSupported", () => {
    it("returns true when vibrate is available", () => {
      Object.defineProperty(global, "navigator", {
        value: { vibrate: vi.fn() },
        configurable: true,
      });
      expect(isHapticSupported()).toBe(true);
    });

    it("returns false when vibrate is not available", () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        configurable: true,
      });
      expect(isHapticSupported()).toBe(false);
    });

    it("returns false when navigator is undefined", () => {
      Object.defineProperty(global, "navigator", {
        value: undefined,
        configurable: true,
      });
      expect(isHapticSupported()).toBe(false);
    });
  });

  describe("triggerHaptic", () => {
    it("calls navigator.vibrate with correct pattern", () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(global, "navigator", {
        value: { vibrate: vibrateMock },
        configurable: true,
      });

      triggerHaptic("LIGHT");
      expect(vibrateMock).toHaveBeenCalledWith([10]);

      triggerHaptic("MEDIUM");
      expect(vibrateMock).toHaveBeenCalledWith([20, 30, 20]);

      triggerHaptic("SUCCESS");
      expect(vibrateMock).toHaveBeenCalledWith([50, 30, 50]);

      triggerHaptic("HEAVY");
      expect(vibrateMock).toHaveBeenCalledWith([30, 50, 30]);

      triggerHaptic("ERROR");
      expect(vibrateMock).toHaveBeenCalledWith([10, 50, 10, 50, 100]);
    });

    it("does not throw when vibrate is not supported", () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        configurable: true,
      });

      expect(() => triggerHaptic("LIGHT")).not.toThrow();
    });

    it("silently catches errors from vibrate", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          vibrate: () => {
            throw new Error("Vibration error");
          },
        },
        configurable: true,
      });

      expect(() => triggerHaptic("LIGHT")).not.toThrow();
    });
  });
});
