import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexTemplate } from "../types";
import { transformTemplate } from "./templates";

const makeTemplate = (overrides?: Partial<ConvexTemplate>): ConvexTemplate => ({
  _id: "j57tpl1",
  _creationTime: 1700000000000,
  name: "Summarize",
  prompt: "Summarize the following...",
  category: "productivity",
  isBuiltIn: false,
  isPublic: false,
  usageCount: 5,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...overrides,
});

describe("transformTemplate", () => {
  it("maps core fields", () => {
    const idMap = new IdMap();
    const result = transformTemplate(makeTemplate(), idMap);
    expect(result.name).toBe("Summarize");
    expect(result.prompt).toBe("Summarize the following...");
    expect(result.category).toBe("productivity");
    expect(result.isBuiltIn).toBe(false);
    expect(result.usageCount).toBe(5);
  });

  it("maps userId via idMap when user was already imported", () => {
    const idMap = new IdMap();
    // Pre-seed user (simulates user already imported)
    idMap.get("users", "j57user1");
    const result = transformTemplate(
      makeTemplate({ userId: "j57user1" }),
      idMap,
    );
    expect(result.userId).toBe(idMap.get("users", "j57user1"));
  });

  it("sets userId to null when user was not imported", () => {
    const idMap = new IdMap();
    // Don't pre-seed user
    const result = transformTemplate(
      makeTemplate({ userId: "j57user_unknown" }),
      idMap,
    );
    expect(result.userId).toBeNull();
  });

  it("sets userId to null for built-in templates", () => {
    const idMap = new IdMap();
    const result = transformTemplate(
      makeTemplate({ userId: undefined, isBuiltIn: true }),
      idMap,
    );
    expect(result.userId).toBeNull();
  });

  it("sets description to null when absent", () => {
    const idMap = new IdMap();
    const result = transformTemplate(
      makeTemplate({ description: undefined }),
      idMap,
    );
    expect(result.description).toBeNull();
  });

  it("preserves description when present", () => {
    const idMap = new IdMap();
    const result = transformTemplate(
      makeTemplate({ description: "A useful template" }),
      idMap,
    );
    expect(result.description).toBe("A useful template");
  });
});
