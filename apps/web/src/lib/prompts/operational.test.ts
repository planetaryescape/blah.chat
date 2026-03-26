import { describe, expect, it } from "vitest";

describe("operational prompts", () => {
  it("exports compaction prompt and builder", async () => {
    const mod = await import("./operational");
    expect(typeof mod.CONVERSATION_COMPACTION_PROMPT).toBe("string");
    expect(mod.CONVERSATION_COMPACTION_PROMPT.length).toBeGreaterThan(10);
    expect(typeof mod.buildCompactionPrompt).toBe("function");
    expect(mod.buildCompactionPrompt("hello")).toContain("hello");
  });

  it("exports title generation prompts", async () => {
    const mod = await import("./operational");
    expect(typeof mod.CONVERSATION_TITLE_PROMPT).toBe("string");
    expect(typeof mod.NOTE_TITLE_PROMPT).toBe("string");
  });

  it("exports auto-tag prompt builder", async () => {
    const mod = await import("./operational");
    expect(typeof mod.buildAutoTagPrompt).toBe("function");
    const result = mod.buildAutoTagPrompt("test content", []);
    expect(result).toContain("test content");
    expect(result).toContain("Auto-tag");
  });
});
