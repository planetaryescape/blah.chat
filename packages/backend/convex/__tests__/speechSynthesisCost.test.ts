import { describe, expect, it } from "vitest";
import { estimateSpeechCost } from "../lib/speech/synthesis";

describe("speech cost estimates", () => {
  it("uses the selected Aura generation's current per-thousand-character rate", () => {
    expect(estimateSpeechCost(1000, "aura-asteria-en")).toBe(0.015);
    expect(estimateSpeechCost(1000, "aura-2-andromeda-en")).toBe(0.03);
    expect(estimateSpeechCost(200, "aura-2-andromeda-en")).toBeCloseTo(0.006);
  });
});
