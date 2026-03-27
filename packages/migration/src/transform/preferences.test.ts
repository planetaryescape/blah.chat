import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexUserPreference } from "../types";
import { transformPreference } from "./preferences";

describe("transformPreference", () => {
  it("maps userId via idMap and drops category", () => {
    const idMap = new IdMap();
    const doc: ConvexUserPreference = {
      _id: "pref1",
      _creationTime: 1700000000000,
      userId: "user1",
      category: "appearance",
      key: "theme",
      value: "dark",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const result = transformPreference(doc, idMap);
    expect(result.userId).toBe(idMap.get("users", "user1"));
    expect(result.key).toBe("theme");
    expect(result.value).toBe("dark");
    expect(result).not.toHaveProperty("category");
  });

  it("preserves complex value objects", () => {
    const idMap = new IdMap();
    const doc: ConvexUserPreference = {
      _id: "pref2",
      _creationTime: 1700000000000,
      userId: "user1",
      category: "models",
      key: "defaultModel",
      value: { model: "gpt-4o", provider: "openai" },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const result = transformPreference(doc, idMap);
    expect(result.value).toEqual({ model: "gpt-4o", provider: "openai" });
  });

  it("handles boolean and numeric values", () => {
    const idMap = new IdMap();
    const doc: ConvexUserPreference = {
      _id: "pref3",
      _creationTime: 1700000000000,
      userId: "user1",
      category: "general",
      key: "soundEnabled",
      value: false,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformPreference(doc, idMap);
    expect(result.value).toBe(false);
    expect(result.key).toBe("soundEnabled");
  });

  it("maps timestamps correctly", () => {
    const idMap = new IdMap();
    const doc: ConvexUserPreference = {
      _id: "pref4",
      _creationTime: 1700000000000,
      userId: "user1",
      category: "chat",
      key: "fontSize",
      value: 14,
      createdAt: 1700000000000,
      updatedAt: 1700000005000,
    };
    const result = transformPreference(doc, idMap);
    expect(result.createdAt).toBe(1700000000000);
    expect(result.updatedAt).toBe(1700000005000);
  });
});
