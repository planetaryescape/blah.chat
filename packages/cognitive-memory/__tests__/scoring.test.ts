import {
  categorizeMemoryType,
  extractTopics,
  scoreImportance,
} from "../src/utils/scoring";

describe("scoring", () => {
  test("scoreImportance base is 0.3 and caps at 1.0", () => {
    expect(scoreImportance("hi")).toBeGreaterThanOrEqual(0.3);
    expect(scoreImportance("hi")).toBeLessThan(0.4);

    const loud = "I decided we must do this tomorrow. Urgent and critical.";
    expect(scoreImportance(loud)).toBeLessThanOrEqual(1.0);
  });

  test("categorizeMemoryType procedural/episodic/semantic", () => {
    expect(categorizeMemoryType("How to do this: step 1 then step 2")).toBe(
      "procedural",
    );
    expect(categorizeMemoryType("Yesterday I met Sarah and we talked")).toBe(
      "episodic",
    );
    expect(categorizeMemoryType("User prefers dark mode")).toBe("semantic");
  });

  test("extractTopics removes stopwords + returns top words", () => {
    const topics = extractTopics(
      "Coffee coffee coffee with no sugar and dark roast please",
      3,
    );
    expect(topics[0]).toBe("coffee");
    expect(topics).toContain("sugar");
  });
});
