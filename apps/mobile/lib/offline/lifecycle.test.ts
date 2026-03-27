import { describe, expect, it, vi } from "vitest";
import { createMobileLifecycleCoordinator, isDeviceOnline } from "./lifecycle";

describe("isDeviceOnline", () => {
  it("returns true when connected and reachable", () => {
    expect(
      isDeviceOnline({ isConnected: true, isInternetReachable: true }),
    ).toBe(true);
  });

  it("returns true when connected and reachability is null (unknown)", () => {
    expect(
      isDeviceOnline({ isConnected: true, isInternetReachable: null }),
    ).toBe(true);
  });

  it("returns false when not connected", () => {
    expect(
      isDeviceOnline({ isConnected: false, isInternetReachable: true }),
    ).toBe(false);
  });

  it("returns false when connected but not reachable", () => {
    expect(
      isDeviceOnline({ isConnected: true, isInternetReachable: false }),
    ).toBe(false);
  });

  it("returns false when connection is null", () => {
    expect(
      isDeviceOnline({ isConnected: null, isInternetReachable: null }),
    ).toBe(false);
  });
});

describe("createMobileLifecycleCoordinator", () => {
  function makeCoordinator() {
    const setOnline = vi.fn();
    const onReconnect = vi.fn();
    const onForeground = vi.fn();
    const coordinator = createMobileLifecycleCoordinator({
      setOnline,
      onReconnect,
      onForeground,
    });
    return { coordinator, setOnline, onReconnect, onForeground };
  }

  describe("handleNetworkChange", () => {
    it("calls setOnline(false) then setOnline(true) on disconnect→reconnect", async () => {
      const { coordinator, setOnline, onReconnect } = makeCoordinator();

      await coordinator.handleNetworkChange({
        isConnected: false,
        isInternetReachable: false,
      });
      await coordinator.handleNetworkChange({
        isConnected: true,
        isInternetReachable: true,
      });

      expect(setOnline).toHaveBeenNthCalledWith(1, false);
      expect(setOnline).toHaveBeenNthCalledWith(2, true);
      expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it("does not call onReconnect when already online", async () => {
      const { coordinator, onReconnect } = makeCoordinator();

      // Already online by default; going online again
      await coordinator.handleNetworkChange({
        isConnected: true,
        isInternetReachable: true,
      });

      expect(onReconnect).not.toHaveBeenCalled();
    });

    it("does not call onReconnect when staying offline", async () => {
      const { coordinator, onReconnect } = makeCoordinator();

      await coordinator.handleNetworkChange({
        isConnected: false,
        isInternetReachable: false,
      });
      await coordinator.handleNetworkChange({
        isConnected: false,
        isInternetReachable: false,
      });

      expect(onReconnect).not.toHaveBeenCalled();
    });

    it("calls onReconnect on each offline→online transition", async () => {
      const { coordinator, onReconnect } = makeCoordinator();

      // First cycle
      await coordinator.handleNetworkChange({
        isConnected: false,
        isInternetReachable: false,
      });
      await coordinator.handleNetworkChange({
        isConnected: true,
        isInternetReachable: true,
      });

      // Second cycle
      await coordinator.handleNetworkChange({
        isConnected: false,
        isInternetReachable: false,
      });
      await coordinator.handleNetworkChange({
        isConnected: true,
        isInternetReachable: true,
      });

      expect(onReconnect).toHaveBeenCalledTimes(2);
    });
  });

  describe("handleAppStateChange", () => {
    it("calls onForeground when transitioning from background to active", async () => {
      const { coordinator, onForeground } = makeCoordinator();

      await coordinator.handleAppStateChange("background");
      await coordinator.handleAppStateChange("active");

      expect(onForeground).toHaveBeenCalledTimes(1);
    });

    it("calls onForeground when transitioning from inactive to active", async () => {
      const { coordinator, onForeground } = makeCoordinator();

      await coordinator.handleAppStateChange("inactive");
      await coordinator.handleAppStateChange("active");

      expect(onForeground).toHaveBeenCalledTimes(1);
    });

    it("does not call onForeground when already active", async () => {
      const { coordinator, onForeground } = makeCoordinator();

      // Already active by default
      await coordinator.handleAppStateChange("active");

      expect(onForeground).not.toHaveBeenCalled();
    });

    it("does not call onForeground when going to background", async () => {
      const { coordinator, onForeground } = makeCoordinator();

      await coordinator.handleAppStateChange("background");

      expect(onForeground).not.toHaveBeenCalled();
    });
  });
});
