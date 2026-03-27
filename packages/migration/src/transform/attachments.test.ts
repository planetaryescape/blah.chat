import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexAttachment } from "../types";
import { transformAttachment } from "./attachments";

const makeAttachment = (
  overrides?: Partial<ConvexAttachment>,
): ConvexAttachment => ({
  _id: "att1",
  _creationTime: 1700000000000,
  messageId: "msg1",
  conversationId: "conv1",
  userId: "user1",
  type: "image",
  name: "photo.jpg",
  storageId: "storage_abc123",
  mimeType: "image/jpeg",
  size: 1024,
  createdAt: 1700000000000,
  ...overrides,
});

describe("transformAttachment", () => {
  it("maps all fields with ID remapping", () => {
    const idMap = new IdMap();
    const result = transformAttachment(makeAttachment(), idMap, "my-bucket");

    expect(result.messageId).toBe(idMap.get("messages", "msg1"));
    expect(result.conversationId).toBe(idMap.get("conversations", "conv1"));
    expect(result.userId).toBe(idMap.get("users", "user1"));
    expect(result.type).toBe("image");
    expect(result.name).toBe("photo.jpg");
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.size).toBe(1024);
    expect(result.bucket).toBe("my-bucket");
  });

  it("generates placeholder key from storageId and filename", () => {
    const idMap = new IdMap();
    const result = transformAttachment(makeAttachment(), idMap, "bucket");
    expect(typeof result.key).toBe("string");
    expect(result.key.length).toBeGreaterThan(0);
    expect(result.key).toContain("storage_abc123");
  });

  it("maps metadata when present", () => {
    const idMap = new IdMap();
    const result = transformAttachment(
      makeAttachment({ metadata: { width: 800, height: 600 } }),
      idMap,
      "bucket",
    );
    expect(result.metadata).toEqual({ width: 800, height: 600 });
  });

  it("sets metadata to null when absent", () => {
    const idMap = new IdMap();
    const result = transformAttachment(makeAttachment(), idMap, "bucket");
    expect(result.metadata).toBeNull();
  });

  it("maps extractedText and extractionError", () => {
    const idMap = new IdMap();
    const result = transformAttachment(
      makeAttachment({
        extractedText: "Some text from image",
        extractionError: undefined,
        extractedAt: 1700000001000,
      }),
      idMap,
      "bucket",
    );
    expect(result.extractedText).toBe("Some text from image");
    expect(result.extractionError).toBeNull();
    expect(result.extractedAt).toBe(1700000001000);
  });
});
