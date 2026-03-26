import { beforeEach, describe, expect, it } from "vitest";
import {
  detectDevicePlatform,
  getPlatform,
  resetDevicePlatformCache,
} from "./platform";

describe("platform utilities (post-cutover)", () => {
  beforeEach(() => {
    resetDevicePlatformCache();
  });

  it("getPlatform returns a valid platform", () => {
    const result = getPlatform();
    expect(["mac", "windows", "other"]).toContain(result);
  });

  it("detectDevicePlatform returns web in SSR", () => {
    expect(detectDevicePlatform()).toBe("web");
  });

  it("does not export shouldUseConvex", async () => {
    const mod = await import("./platform");
    expect("shouldUseConvex" in mod).toBe(false);
  });

  it("does not export getDataFetchingStrategy", async () => {
    const mod = await import("./platform");
    expect("getDataFetchingStrategy" in mod).toBe(false);
  });

  it("does not export DataFetchingStrategy type artifacts at runtime", async () => {
    const mod = await import("./platform");
    expect("getEffectiveStrategy" in mod).toBe(false);
    expect("getManualOverride" in mod).toBe(false);
  });
});
