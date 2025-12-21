import { describe, expect, it } from "vitest";

import {
  formatDuration,
  formatTTFT,
  isCachedResponse,
} from "../formatMetrics";

describe("formatTTFT", () => {
  it("formats <100ms as whole milliseconds", () => {
    expect(formatTTFT(45)).toBe("45ms");
    expect(formatTTFT(99)).toBe("99ms");
    expect(formatTTFT(0)).toBe("0ms");
  });

  it("formats 100-999ms as decimal seconds with 2 places", () => {
    expect(formatTTFT(100)).toBe("0.10s");
    expect(formatTTFT(450)).toBe("0.45s");
    expect(formatTTFT(999)).toBe("1.00s");
  });

  it("formats 1-10s as decimal seconds with 1 place", () => {
    expect(formatTTFT(1000)).toBe("1.0s");
    expect(formatTTFT(2300)).toBe("2.3s");
    expect(formatTTFT(9999)).toBe("10.0s");
  });

  it("formats >10s as whole seconds", () => {
    expect(formatTTFT(10000)).toBe("10s");
    expect(formatTTFT(15000)).toBe("15s");
    expect(formatTTFT(60000)).toBe("60s");
  });
});

describe("formatDuration", () => {
  it("formats <1ms as '<1ms'", () => {
    expect(formatDuration(0)).toBe("<1ms");
    expect(formatDuration(0.5)).toBe("<1ms");
  });

  it("formats 1-999ms as whole milliseconds", () => {
    expect(formatDuration(1)).toBe("1ms");
    expect(formatDuration(234)).toBe("234ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formats 1-10s as decimal seconds with 1 place", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1200)).toBe("1.2s");
    expect(formatDuration(5300)).toBe("5.3s");
    expect(formatDuration(9999)).toBe("10.0s");
  });

  it("formats 10-59s as whole seconds", () => {
    expect(formatDuration(10000)).toBe("10s");
    expect(formatDuration(15000)).toBe("15s");
    expect(formatDuration(45000)).toBe("45s");
  });

  it("formats >=60s as minutes and seconds", () => {
    expect(formatDuration(60000)).toBe("1m");
    expect(formatDuration(83000)).toBe("1m 23s");
    expect(formatDuration(312000)).toBe("5m 12s");
    expect(formatDuration(120000)).toBe("2m");
  });
});

describe("isCachedResponse", () => {
  it("returns true for TTFT <50ms", () => {
    expect(isCachedResponse(0)).toBe(true);
    expect(isCachedResponse(25)).toBe(true);
    expect(isCachedResponse(49)).toBe(true);
  });

  it("returns false for TTFT >=50ms", () => {
    expect(isCachedResponse(50)).toBe(false);
    expect(isCachedResponse(100)).toBe(false);
    expect(isCachedResponse(500)).toBe(false);
  });
});
