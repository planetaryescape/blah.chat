import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexProject } from "../types";
import { transformProject } from "./projects";

const makeProject = (overrides?: Partial<ConvexProject>): ConvexProject => ({
  _id: "j57proj1",
  _creationTime: 1700000000000,
  userId: "j57user1",
  name: "My Project",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...overrides,
});

describe("transformProject", () => {
  it("maps core fields with ID remapping", () => {
    const idMap = new IdMap();
    const result = transformProject(makeProject(), idMap);
    expect(result.userId).toBe(idMap.get("users", "j57user1"));
    expect(result.name).toBe("My Project");
    expect(result.isTemplate).toBe(false);
  });

  it("maps createdFrom via idMap when present", () => {
    const idMap = new IdMap();
    const result = transformProject(
      makeProject({ createdFrom: "j57proj0" }),
      idMap,
    );
    expect(result.createdFrom).toBe(idMap.get("projects", "j57proj0"));
  });

  it("sets nullable fields to null when absent", () => {
    const idMap = new IdMap();
    const result = transformProject(makeProject(), idMap);
    expect(result.description).toBeNull();
    expect(result.systemPrompt).toBeNull();
    expect(result.createdFrom).toBeNull();
  });

  it("maps description and systemPrompt when present", () => {
    const idMap = new IdMap();
    const result = transformProject(
      makeProject({
        description: "A test project",
        systemPrompt: "You are helpful",
        isTemplate: true,
      }),
      idMap,
    );
    expect(result.description).toBe("A test project");
    expect(result.systemPrompt).toBe("You are helpful");
    expect(result.isTemplate).toBe(true);
  });
});
