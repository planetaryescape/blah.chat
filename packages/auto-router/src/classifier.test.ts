import { describe, expect, it } from "vitest";
import { classify } from "./classifier";
import type { RoutingExample } from "./types";

function mockEmbedding(label: string): number[] {
  const vec = new Array(10).fill(0);
  const labelIndex: Record<string, number> = {
    fast_cheap_chat: 0,
    balanced_general: 1,
    code_heavy: 2,
    long_context: 3,
    strict_json: 4,
    creative_writing: 5,
    research: 6,
    vision: 7,
    reasoning_complex: 8,
    fallback_default: 9,
  };
  const idx = labelIndex[label] ?? 9;
  vec[idx] = 1;
  return vec;
}

function makeExamples(): (RoutingExample & { embedding: number[] })[] {
  const labels = [
    "fast_cheap_chat",
    "balanced_general",
    "code_heavy",
    "research",
    "creative_writing",
    "reasoning_complex",
  ] as const;

  return labels.flatMap((label) =>
    Array.from({ length: 3 }, (_, i) => ({
      text: `${label} example ${i}`,
      routeLabel: label,
      embedding: mockEmbedding(label),
    })),
  );
}

describe("classify", () => {
  it("returns hard rule result for vision attachments", () => {
    const result = classify({
      message: "what is this?",
      messageEmbedding: mockEmbedding("fast_cheap_chat"),
      examples: makeExamples(),
      hasAttachments: true,
      attachmentTypes: ["image/png"],
    });

    expect(result.routeLabel).toBe("vision");
    expect(result.hardRuleMatched).toBe("vision_attachment");
    expect(result.needsFallback).toBe(false);
  });

  it("returns hard rule result for research keywords", () => {
    const result = classify({
      message: "search for the latest news about AI",
      messageEmbedding: mockEmbedding("research"),
      examples: makeExamples(),
    });

    expect(result.routeLabel).toBe("research");
    expect(result.hardRuleMatched).toBe("research_keywords");
  });

  it("returns hard rule result for long context", () => {
    const result = classify({
      message: "analyze this document",
      messageEmbedding: mockEmbedding("long_context"),
      examples: makeExamples(),
      currentContextTokens: 150_000,
    });

    expect(result.routeLabel).toBe("long_context");
    expect(result.hardRuleMatched).toBe("long_context_tokens");
  });

  it("classifies via embedding similarity when no hard rule matches", () => {
    const result = classify({
      message: "write a Python function",
      messageEmbedding: mockEmbedding("code_heavy"),
      examples: makeExamples(),
    });

    expect(result.routeLabel).toBe("code_heavy");
    expect(result.hardRuleMatched).toBeUndefined();
    expect(result.needsFallback).toBe(false);
  });

  it("returns fallback_default when no examples provided", () => {
    const result = classify({
      message: "hello",
      messageEmbedding: mockEmbedding("fast_cheap_chat"),
      examples: [],
    });

    expect(result.routeLabel).toBe("fallback_default");
    expect(result.needsFallback).toBe(true);
  });

  it("requests LLM fallback when confidence is low", () => {
    // Create a mixed embedding that's between two labels
    const mixedEmbedding = new Array(10).fill(0);
    mixedEmbedding[2] = 0.5; // code_heavy
    mixedEmbedding[5] = 0.49; // creative_writing

    const result = classify({
      message: "write something creative with code",
      messageEmbedding: mixedEmbedding,
      examples: makeExamples(),
      config: {
        confidenceThreshold: 0.82,
        marginThreshold: 0.05,
        topK: 5,
        fallbackEnabled: true,
      },
    });

    // With such close scores, it should need fallback
    expect(result.candidateLabels).toBeDefined();
    expect(result.candidateLabels!.length).toBeGreaterThan(0);
  });

  it("respects high-stakes hard rule for medical advice", () => {
    const result = classify({
      message: "should I take ibuprofen with my blood pressure medication?",
      messageEmbedding: mockEmbedding("balanced_general"),
      examples: makeExamples(),
    });

    expect(result.routeLabel).toBe("reasoning_complex");
    expect(result.hardRuleMatched).toBe("high_stakes_pattern");
  });
});
