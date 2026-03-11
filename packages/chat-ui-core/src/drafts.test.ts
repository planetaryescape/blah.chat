import {
  deserializeDraftRecord,
  emptyDraft,
  isEmptyDraft,
  serializeDraftRecord,
} from "./drafts";

describe("drafts", () => {
  it("returns empty record for bad json", () => {
    expect(deserializeDraftRecord("{bad")).toEqual({});
  });

  it("hydrates legacy text-only entries", () => {
    const record = deserializeDraftRecord(JSON.stringify({ abc: "hello" }));
    expect(record.abc?.text).toBe("hello");
    expect(record.abc?.surfaceId).toBe("web");
  });

  it("prunes empty drafts during serialization", () => {
    const empty = emptyDraft({ surfaceId: "web", conversationId: "abc" });
    expect(isEmptyDraft(empty)).toBe(true);
    expect(serializeDraftRecord({ abc: empty })).toBe("{}");
  });

  it("round-trips populated drafts", () => {
    const draft = emptyDraft({ surfaceId: "mobile", conversationId: "abc" });
    draft.text = "hello";
    draft.selectedModel = "openai:gpt-5-mini";
    const serialized = serializeDraftRecord({ abc: draft });
    const record = deserializeDraftRecord(serialized);
    expect(record.abc?.text).toBe("hello");
    expect(record.abc?.selectedModel).toBe("openai:gpt-5-mini");
    expect(record.abc?.surfaceId).toBe("mobile");
  });
});
