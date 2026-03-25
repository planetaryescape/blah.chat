import { beforeEach, describe, expect, it } from "vitest";
import {
  getDataFetchingStrategy,
  resetDevicePlatformCache,
  shouldUseConvex,
  shouldUseSSE,
} from "./platform";

describe("data fetching strategy (post-cutover)", () => {
  beforeEach(() => {
    resetDevicePlatformCache();
  });

  it("returns sse for all platforms (no longer convex)", () => {
    expect(getDataFetchingStrategy()).toBe("sse");
  });

  it("shouldUseConvex returns false", () => {
    expect(shouldUseConvex()).toBe(false);
  });

  it("shouldUseSSE returns true", () => {
    expect(shouldUseSSE()).toBe(true);
  });
});
