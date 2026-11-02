import { describe, expect, it } from "vitest";
import { prepareDeterministic } from "../lib/speech/prepare";

describe("substantive footnote preservation", () => {
  it("does not discard a one-word qualification as a link definition", async () => {
    const source = "Safe.[^1]\n\n[^1]: Not.";
    const { narration } = await prepareDeterministic(source);
    expect(narration.segments.at(-1)?.text).toBe("Footnote 1. Not.");
    const note = narration.segments.at(-1);
    if (!note) throw new Error("Expected the substantive footnote segment");
    expect(source.slice(note.sourceStart, note.sourceEnd)).toBe("[^1]: Not.");
    expect(narration.coverage).toBe("complete");
  });
  it("keeps longer footnotes and ordinary link definitions distinct", async () => {
    const source =
      "[Guide][guide].[^1]\n\n[^1]: Not guaranteed.\n\n[guide]: https://example.org/guide";
    const { narration } = await prepareDeterministic(source);
    const text = narration.segments.map((segment) => segment.text).join(" ");
    expect(text).toContain("Guide");
    expect(text).toContain("Not guaranteed.");
    expect(text).not.toContain("https://example.org/guide");
  });
  it.each([
    "> Safe.[^1]\n>\n> [^1]: Not.",
    "- Safe.[^1]\n\n  [^1]: Not.",
    "> - Safe.[^1]\n>\n>   [^1]: Not.",
    "- > Safe.[^1]\n  >\n  > [^1]: Not.",
  ])("retains the qualification once inside nested containers: %s", async (source) => {
    for (const input of [source, source.replaceAll("\n", "\r\n")]) {
      const { narration } = await prepareDeterministic(input);
      const notes = narration.segments.filter(
        (s) => s.text === "Footnote 1. Not.",
      );
      expect(notes).toHaveLength(1);
      expect(input.slice(notes[0].sourceStart, notes[0].sourceEnd)).toContain(
        "[^1]: Not.",
      );
      expect(narration.segments.map((s) => s.sourceStart)).toEqual(
        narration.segments.map((s) => s.sourceStart).sort((a, b) => a - b),
      );
    }
  });
});
