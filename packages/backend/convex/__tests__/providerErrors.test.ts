import { describe, expect, it } from "vitest";
import {
  classifyStreamingError,
  detectCreditsError,
  getProviderStatusCode,
} from "../lib/errorTracking";

describe("provider error classification", () => {
  it.each([
    "Too many requests",
    "Rate limit exceeded",
    "Token quota exceeded for this minute",
  ])("does not call ordinary 429 throttling exhausted credits: %s", (message) => {
    const error = Object.assign(new Error(message), {
      statusCode: 429,
    });
    expect(detectCreditsError(error)).toBe(false);
    expect(classifyStreamingError(error)).toBe("rate_limit");
  });
  it("classifies wrapped authentication errors without depending on wording", () => {
    const error = new Error("Upstream failed", { cause: { statusCode: 401 } });
    expect(classifyStreamingError(error)).toBe("auth_error");
    expect(detectCreditsError(error)).toBe(false);
  });
  it("recognizes SDK payment statusCode and explicit quota exhaustion", () => {
    expect(
      detectCreditsError(
        Object.assign(new Error("Payment required"), { statusCode: 402 }),
      ),
    ).toBe(true);
    expect(detectCreditsError(new Error("Insufficient quota"))).toBe(true);
    expect(
      detectCreditsError(
        Object.assign(new Error("insufficient_quota"), { statusCode: 429 }),
      ),
    ).toBe(true);
  });
  it("handles unknown and cyclic causes safely", () => {
    const error = new Error("Failure");
    error.cause = error;
    expect(getProviderStatusCode(error)).toBeUndefined();
    expect(getProviderStatusCode(null)).toBeUndefined();
    expect(detectCreditsError(null)).toBe(false);
  });
});
