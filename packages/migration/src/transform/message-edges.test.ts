import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexMessage } from "../types";
import { transformMessageEdges } from "./message-edges";

const makeMsg = (overrides?: Partial<ConvexMessage>): ConvexMessage => ({
  _id: "child1",
  _creationTime: 1700000000000,
  conversationId: "conv1",
  role: "assistant",
  content: "Hello",
  status: "complete",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...overrides,
});

describe("transformMessageEdges", () => {
  it("creates edges from parentMessageIds array", () => {
    const idMap = new IdMap();
    const edges = transformMessageEdges(
      makeMsg({ parentMessageIds: ["parent1", "parent2"] }),
      idMap,
    );

    expect(edges).toHaveLength(2);
    expect(edges[0].parentMessageId).toBe(idMap.get("messages", "parent1"));
    expect(edges[0].childMessageId).toBe(idMap.get("messages", "child1"));
    expect(edges[0].position).toBe(0);
    expect(edges[0].edgeType).toBe("reply");
    expect(edges[1].position).toBe(1);
  });

  it("returns empty array for root messages (no parents)", () => {
    const idMap = new IdMap();
    const edges = transformMessageEdges(makeMsg(), idMap);
    expect(edges).toHaveLength(0);
  });

  it("falls back to legacy parentMessageId when parentMessageIds absent", () => {
    const idMap = new IdMap();
    const edges = transformMessageEdges(
      makeMsg({ parentMessageId: "legacyParent" }),
      idMap,
    );

    expect(edges).toHaveLength(1);
    expect(edges[0].parentMessageId).toBe(
      idMap.get("messages", "legacyParent"),
    );
    expect(edges[0].position).toBe(0);
  });

  it("prefers parentMessageIds over legacy parentMessageId", () => {
    const idMap = new IdMap();
    const edges = transformMessageEdges(
      makeMsg({
        parentMessageIds: ["newParent"],
        parentMessageId: "legacyParent",
      }),
      idMap,
    );

    expect(edges).toHaveLength(1);
    expect(edges[0].parentMessageId).toBe(idMap.get("messages", "newParent"));
  });

  it("handles empty parentMessageIds array as root", () => {
    const idMap = new IdMap();
    const edges = transformMessageEdges(
      makeMsg({ parentMessageIds: [] }),
      idMap,
    );
    expect(edges).toHaveLength(0);
  });

  it("includes createdAt timestamp from parent message", () => {
    const idMap = new IdMap();
    const edges = transformMessageEdges(
      makeMsg({ parentMessageIds: ["p1"], createdAt: 1700000005000 }),
      idMap,
    );
    expect(edges[0].createdAt).toBe(1700000005000);
  });
});
