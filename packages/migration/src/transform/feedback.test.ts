import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexFeedback } from "../types";
import { transformFeedback } from "./feedback";

describe("transformFeedback", () => {
  it("maps core fields", () => {
    const idMap = new IdMap();
    const doc: ConvexFeedback = {
      _id: "fb1",
      _creationTime: 1700000000000,
      userId: "user1",
      userEmail: "test@test.com",
      userName: "Test",
      page: "/chat",
      feedbackType: "bug",
      description: "Something broke",
      status: "new",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformFeedback(doc, idMap);
    expect(result.feedbackType).toBe("bug");
    expect(result.priority).toBe("none");
    expect(result.tags).toEqual([]);
  });

  it("maps screenshotStorageId to placeholder key", () => {
    const idMap = new IdMap();
    const doc: ConvexFeedback = {
      _id: "fb2",
      _creationTime: 1700000000000,
      userId: "user1",
      userEmail: "test@test.com",
      userName: "Test",
      page: "/chat",
      feedbackType: "bug",
      description: "Screenshot bug",
      screenshotStorageId: "storage_screenshot123",
      status: "new",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformFeedback(doc, idMap);
    expect(result.screenshotKey).toContain("storage_screenshot123");
  });

  it("transforms aiTriage shape (drops possibleDuplicateId)", () => {
    const idMap = new IdMap();
    const doc: ConvexFeedback = {
      _id: "fb3",
      _creationTime: 1700000000000,
      userId: "user1",
      userEmail: "test@test.com",
      userName: "Test",
      page: "/chat",
      feedbackType: "bug",
      description: "Bug with triage",
      status: "triaging",
      aiTriage: {
        suggestedPriority: "high",
        suggestedTags: ["ui"],
        possibleDuplicateId: "fb0",
        triageNotes: "Looks like a UI bug",
        createdAt: 1700000000000,
      },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformFeedback(doc, idMap);
    const triage = result.aiTriage as Record<string, unknown>;
    expect(triage.suggestedPriority).toBe("high");
    expect(triage).not.toHaveProperty("possibleDuplicateId");
  });

  it("sets aiTriage to null when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexFeedback = {
      _id: "fb4",
      _creationTime: 1700000000000,
      userId: "user1",
      userEmail: "test@test.com",
      userName: "Test",
      page: "/settings",
      feedbackType: "feature",
      description: "Add dark mode",
      status: "new",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformFeedback(doc, idMap);
    expect(result.aiTriage).toBeNull();
    expect(result.screenshotKey).toBeNull();
    expect(result.feedbackType).toBe("feature");
  });
});
