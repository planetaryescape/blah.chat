import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexChatSuggestionsCache } from "../types";
import { transformStarterSuggestions } from "./starter-suggestions";

describe("transformStarterSuggestions", () => {
  it("maps suggestions as JSONB and drops fingerprint/expiresAt", () => {
    const idMap = new IdMap();
    const doc: ConvexChatSuggestionsCache = {
      _id: "ssc1",
      _creationTime: 1700000000000,
      userId: "user1",
      fingerprint: "fp_abc123",
      suggestions: [
        { id: "s1", text: "Tell me a joke", icon: "sparkles" as const },
      ],
      generatedAt: 1700000000000,
      expiresAt: 1700086400000,
      updatedAt: 1700000000000,
    };

    const result = transformStarterSuggestions(doc, idMap);
    expect(result.userId).toBe(idMap.get("users", "user1"));
    expect(result.suggestions).toEqual([
      { id: "s1", text: "Tell me a joke", icon: "sparkles" },
    ]);
    expect(result.needsRefresh).toBe(false);
    expect(result.source).toBe("cache");
    expect(result).not.toHaveProperty("fingerprint");
    expect(result).not.toHaveProperty("expiresAt");
  });

  it("preserves generatedAt and maps timestamps", () => {
    const idMap = new IdMap();
    const doc: ConvexChatSuggestionsCache = {
      _id: "ssc2",
      _creationTime: 1700000000000,
      userId: "user1",
      suggestions: [],
      generatedAt: 1700000005000,
      updatedAt: 1700000010000,
    };
    const result = transformStarterSuggestions(doc, idMap);
    expect(result.generatedAt).toBe(1700000005000);
    expect(result.updatedAt).toBe(1700000010000);
    expect(result.suggestions).toEqual([]);
  });

  it("handles multiple suggestions", () => {
    const idMap = new IdMap();
    const doc: ConvexChatSuggestionsCache = {
      _id: "ssc3",
      _creationTime: 1700000000000,
      userId: "user1",
      suggestions: [
        { id: "s1", text: "First", icon: "sparkles" as const },
        { id: "s2", text: "Second", icon: "lightbulb" as const },
      ],
      generatedAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformStarterSuggestions(doc, idMap);
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[1]).toEqual({
      id: "s2",
      text: "Second",
      icon: "lightbulb",
    });
  });
});
