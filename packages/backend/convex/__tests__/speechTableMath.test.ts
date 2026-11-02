import { describe, expect, it } from "vitest";
import { prepareDeterministic } from "../lib/speech/prepare";

describe("table subtraction coverage", () => {
  it.each([
    "a - b",
    "a-b",
    "12-5",
    "12 - 5",
    "3.050 - 2.0",
  ])("discloses subtraction in headers and cells without losing source: %s", async (expression) => {
    for (const source of [
      `| ${expression} | Value |\n| --- | --- |\n| label | 0 |`,
      `| Formula | Value |\n| --- | --- |\n| ${expression} | 0 |`,
    ]) {
      const { narration } = await prepareDeterministic(source);
      expect(narration.coverage).toBe("partial");
      expect(narration.warnings).toContain(
        "Mathematical notation in table cells is retained; spoken grouping and pronunciation are unavailable.",
      );
      const details = narration.segments.filter(
        (segment) => segment.kind === "table",
      );
      expect(details.map((segment) => segment.text).join(" ")).toContain(
        expression,
      );
      expect(details.map((segment) => segment.text).join(" ")).toContain(
        ": 0.",
      );
      for (const segment of details)
        expect(source.slice(segment.sourceStart, segment.sourceEnd)).toBe(
          source,
        );
    }
  });

  it.each([
    "well-known",
    "state-of-the-art",
    "short - long",
  ])("does not classify ordinary hyphenated prose as subtraction: %s", async (prose) => {
    const { narration } = await prepareDeterministic(
      `| Description | Value |\n| --- | --- |\n| ${prose} | 0 |`,
    );
    expect(narration.coverage).toBe("complete");
    expect(narration.warnings).toEqual([]);
    expect(
      narration.segments.map((segment) => segment.text).join(" "),
    ).toContain(prose);
  });
});
