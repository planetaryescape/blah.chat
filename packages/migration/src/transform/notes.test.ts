import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexNote } from "../types";
import { transformNote } from "./notes";

const makeNote = (overrides?: Partial<ConvexNote>): ConvexNote => ({
  _id: "note1",
  _creationTime: 1700000000000,
  userId: "user1",
  title: "My Note",
  content: "Some content",
  isPinned: false,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...overrides,
});

describe("transformNote", () => {
  it("maps core fields", () => {
    const idMap = new IdMap();
    const { note } = transformNote(makeNote(), idMap);
    expect(note.title).toBe("My Note");
    expect(note.content).toBe("Some content");
    expect(note.tags).toEqual([]);
    expect(note.suggestedTags).toEqual([]);
    expect(note.isPinned).toBe(false);
  });

  it("maps sourceMessageId and sourceConversationId via idMap", () => {
    const idMap = new IdMap();
    const { note } = transformNote(
      makeNote({ sourceMessageId: "msg1", sourceConversationId: "conv1" }),
      idMap,
    );
    expect(note.sourceMessageId).toBe(idMap.get("messages", "msg1"));
    expect(note.sourceConversationId).toBe(idMap.get("conversations", "conv1"));
  });

  it("drops htmlContent (not in PG schema)", () => {
    const idMap = new IdMap();
    const { note } = transformNote(
      makeNote({ htmlContent: "<p>hi</p>" }),
      idMap,
    );
    expect(note).not.toHaveProperty("htmlContent");
  });

  it("maps userId via idMap", () => {
    const idMap = new IdMap();
    const { note } = transformNote(makeNote(), idMap);
    expect(note.userId).toBe(idMap.get("users", "user1"));
  });

  it("extracts embedding when present", () => {
    const idMap = new IdMap();
    const { embedding } = transformNote(
      makeNote({ embedding: [0.1, 0.2] }),
      idMap,
    );
    expect(embedding).not.toBeUndefined();
    expect(embedding!.embedding).toBe("[0.1,0.2]");
  });

  it("no embedding when absent", () => {
    const idMap = new IdMap();
    const { embedding } = transformNote(makeNote(), idMap);
    expect(embedding).toBeUndefined();
  });
});
