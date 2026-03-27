import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexTask } from "../types";
import { transformTask } from "./tasks";

describe("transformTask", () => {
  it("maps core fields", () => {
    const idMap = new IdMap();
    const doc: ConvexTask = {
      _id: "task1",
      _creationTime: 1700000000000,
      userId: "user1",
      title: "Fix bug",
      status: "in_progress",
      tags: ["urgent"],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const { task } = transformTask(doc, idMap);
    expect(task.title).toBe("Fix bug");
    expect(task.status).toBe("in_progress");
    expect(task.tags).toEqual(["urgent"]);
  });

  it("maps sourceContext as JSONB", () => {
    const idMap = new IdMap();
    const doc: ConvexTask = {
      _id: "task2",
      _creationTime: 1700000000000,
      userId: "user1",
      title: "Review",
      status: "suggested",
      sourceContext: { snippet: "code here", confidence: 0.9 },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const { task } = transformTask(doc, idMap);
    expect(task.sourceContext).toEqual({
      snippet: "code here",
      confidence: 0.9,
    });
  });

  it("extracts embedding when present", () => {
    const idMap = new IdMap();
    const doc: ConvexTask = {
      _id: "task3",
      _creationTime: 1700000000000,
      userId: "user1",
      title: "Test",
      status: "completed",
      embedding: [0.5, 0.6],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const { embedding } = transformTask(doc, idMap);
    expect(embedding).not.toBeUndefined();
    expect(embedding!.embedding).toBe("[0.5,0.6]");
  });

  it("returns undefined embedding when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexTask = {
      _id: "task4",
      _creationTime: 1700000000000,
      userId: "user1",
      title: "No embed",
      status: "open",
      tags: [],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const { task, embedding } = transformTask(doc, idMap);
    expect(embedding).toBeUndefined();
    expect(task.tags).toEqual([]);
    expect(task.sourceContext).toBeNull();
  });
});
