import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL_ID } from "../models";
import { getModel } from "../registry";

afterEach(() => vi.unstubAllEnvs());

describe("OpenRouter authentication preflight", () => {
  it.each([
    "",
    "   ",
  ])("rejects a missing or blank backend key before making an inference request", (key) => {
    vi.stubEnv("OPENROUTER_API_KEY", key);
    expect(() => getModel("openrouter:gpt-5.5")).toThrow(
      /OpenRouter authentication.*OPENROUTER_API_KEY.*backend/,
    );
  });
  it("does not break the direct default when OpenRouter is unconfigured", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "test-not-used-for-network");
    expect(getModel(DEFAULT_MODEL_ID).modelId).toBe("openai/gpt-oss-120b");
  });
  it("uses the verified API model ID when a backend key is configured", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-not-used-for-network");
    expect(getModel("openrouter:gpt-5.5").modelId).toBe("openai/gpt-5.5");
  });
});
