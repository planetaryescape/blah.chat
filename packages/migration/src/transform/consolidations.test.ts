import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexMessage } from "../types";
import { transformConsolidation } from "./consolidations";

const makeMsg = (overrides?: Partial<ConvexMessage>): ConvexMessage => ({
  _id: "consol1",
  _creationTime: 1700000000000,
  conversationId: "conv1",
  role: "assistant",
  content: "Consolidated response",
  status: "complete",
  model: "gpt-4o",
  isConsolidation: true,
  comparisonGroupId: "cg-1",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...overrides,
});

describe("transformConsolidation", () => {
  it("creates a consolidation row from a consolidation message", () => {
    const idMap = new IdMap();
    const result = transformConsolidation(makeMsg(), idMap);

    expect(result).not.toBeNull();
    expect(result!.comparisonGroupId).toBe("cg-1");
    expect(result!.consolidatedMessageId).toBe(
      idMap.get("messages", "consol1"),
    );
    expect(result!.modelId).toBe("gpt-4o");
    expect(result!.status).toBe("completed");
  });

  it("returns null for non-consolidation messages", () => {
    const idMap = new IdMap();
    const result = transformConsolidation(
      makeMsg({ isConsolidation: false }),
      idMap,
    );
    expect(result).toBeNull();
  });

  it("returns null when comparisonGroupId is missing", () => {
    const idMap = new IdMap();
    const result = transformConsolidation(
      makeMsg({ comparisonGroupId: undefined }),
      idMap,
    );
    expect(result).toBeNull();
  });

  it("maps generating status to generating (not completed)", () => {
    const idMap = new IdMap();
    const result = transformConsolidation(
      makeMsg({ status: "generating" }),
      idMap,
    );
    expect(result!.status).toBe("generating");
  });

  it("maps conversationId and timestamps via idMap", () => {
    const idMap = new IdMap();
    const result = transformConsolidation(makeMsg(), idMap);
    expect(result!.conversationId).toBe(idMap.get("conversations", "conv1"));
    expect(result!.createdAt).toBe(1700000000000);
    expect(result!.updatedAt).toBe(1700000000000);
  });
});
