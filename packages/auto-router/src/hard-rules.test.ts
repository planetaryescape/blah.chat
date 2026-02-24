import { describe, expect, it } from "vitest";
import { runHardRules } from "./hard-rules";

describe("runHardRules", () => {
  it("detects vision from image attachments", () => {
    const result = runHardRules({
      message: "what is this?",
      hasAttachments: true,
      attachmentTypes: ["image/png"],
    });
    expect(result?.routeLabel).toBe("vision");
    expect(result?.hardRuleMatched).toBe("vision_attachment");
  });

  it("does not trigger vision for non-image attachments", () => {
    const result = runHardRules({
      message: "analyze this",
      hasAttachments: true,
      attachmentTypes: ["application/pdf"],
    });
    expect(result?.routeLabel).not.toBe("vision");
  });

  it("detects research keywords", () => {
    expect(
      runHardRules({
        message: "search for React tutorials",
        hasAttachments: false,
      })?.routeLabel,
    ).toBe("research");
    expect(
      runHardRules({
        message: "find me the best restaurants",
        hasAttachments: false,
      })?.routeLabel,
    ).toBe("research");
    expect(
      runHardRules({
        message: "latest news about SpaceX",
        hasAttachments: false,
      })?.routeLabel,
    ).toBe("research");
  });

  it("detects long context", () => {
    const result = runHardRules({
      message: "summarize this",
      hasAttachments: false,
      currentContextTokens: 150_000,
    });
    expect(result?.routeLabel).toBe("long_context");
  });

  it("does not trigger long context under threshold", () => {
    const result = runHardRules({
      message: "summarize this",
      hasAttachments: false,
      currentContextTokens: 50_000,
    });
    expect(result?.routeLabel).not.toBe("long_context");
  });

  it("detects high-stakes medical advice", () => {
    expect(
      runHardRules({
        message: "should I take ibuprofen with my blood pressure medication?",
        hasAttachments: false,
      })?.routeLabel,
    ).toBe("reasoning_complex");

    expect(
      runHardRules({
        message: "am I having a heart attack?",
        hasAttachments: false,
      })?.routeLabel,
    ).toBe("reasoning_complex");
  });

  it("does not trigger high-stakes for educational questions", () => {
    const result = runHardRules({
      message: "what is ibuprofen?",
      hasAttachments: false,
    });
    expect(result).toBeNull();
  });

  it("detects JSON extraction requests", () => {
    expect(
      runHardRules({
        message: "extract the data and return as json",
        hasAttachments: false,
      })?.routeLabel,
    ).toBe("strict_json");
    expect(
      runHardRules({
        message: "parse this to json",
        hasAttachments: false,
      })?.routeLabel,
    ).toBe("strict_json");
  });

  it("detects code fences", () => {
    const result = runHardRules({
      message:
        "```typescript\nconst x = 1;\nconsole.log(x);\n```\nfix this code",
      hasAttachments: false,
    });
    expect(result?.routeLabel).toBe("code_heavy");
  });

  it("returns null for simple chat", () => {
    const result = runHardRules({
      message: "hello, how are you?",
      hasAttachments: false,
    });
    expect(result).toBeNull();
  });

  it("first matching rule wins (vision before research)", () => {
    const result = runHardRules({
      message: "search for this image",
      hasAttachments: true,
      attachmentTypes: ["image/jpeg"],
    });
    expect(result?.routeLabel).toBe("vision");
  });
});
