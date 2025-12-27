import { describe, expect, it } from "vitest";

import { levenshteinDistance } from "../stringUtils";

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0);
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("returns length for comparison with empty string", () => {
    expect(levenshteinDistance("hello", "")).toBe(5);
    expect(levenshteinDistance("", "world")).toBe(5);
  });

  it("counts single character substitutions", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
    expect(levenshteinDistance("cat", "car")).toBe(1);
  });

  it("counts single character insertions", () => {
    expect(levenshteinDistance("cat", "cats")).toBe(1);
    expect(levenshteinDistance("cat", "scat")).toBe(1);
  });

  it("counts single character deletions", () => {
    expect(levenshteinDistance("cats", "cat")).toBe(1);
    expect(levenshteinDistance("scat", "cat")).toBe(1);
  });

  it("handles classic example: kitten -> sitting", () => {
    // kitten → sitten (substitute s for k)
    // sitten → sittin (substitute i for e)
    // sittin → sitting (insert g)
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });

  it("handles typo detection in tags", () => {
    // machne-learning → machine-learning (insert i)
    expect(levenshteinDistance("machine-learning", "machne-learning")).toBe(1);
  });

  it("is symmetric", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(
      levenshteinDistance("xyz", "abc"),
    );
  });
});
