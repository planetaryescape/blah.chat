import { describe, expect, it } from "vitest";
import type { ConvexTtsCache } from "../types";
import { transformTtsCache } from "./tts-cache";

describe("transformTtsCache", () => {
  it("maps all fields and generates R2 key from hash and format", () => {
    const doc: ConvexTtsCache = {
      _id: "tts1",
      _creationTime: 1700000000000,
      hash: "sha256abc",
      storageId: "storage_tts1",
      text: "Hello world",
      voice: "nova",
      speed: 1.0,
      format: "mp3",
      createdAt: 1700000000000,
      lastAccessedAt: 1700000001000,
    };
    const result = transformTtsCache(doc, "my-bucket");
    expect(result.hash).toBe("sha256abc");
    expect(result.key).toBe("cache/tts/sha256abc.mp3");
    expect(result.bucket).toBe("my-bucket");
    expect(result.text).toBe("Hello world");
    expect(result.voice).toBe("nova");
    expect(result.speed).toBe(1.0);
    expect(result.format).toBe("mp3");
    expect(result.createdAt).toBe(1700000000000);
    expect(result.lastAccessedAt).toBe(1700000001000);
  });

  it("constructs correct key for different formats", () => {
    const doc: ConvexTtsCache = {
      _id: "tts2",
      _creationTime: 1700000000000,
      hash: "xyz789",
      storageId: "storage_tts2",
      text: "Test",
      voice: "alloy",
      speed: 1.5,
      format: "opus",
      createdAt: 1700000000000,
      lastAccessedAt: 1700000000000,
    };
    const result = transformTtsCache(doc, "prod-bucket");
    expect(result.key).toBe("cache/tts/xyz789.opus");
    expect(result.bucket).toBe("prod-bucket");
    expect(result.voice).toBe("alloy");
    expect(result.speed).toBe(1.5);
  });
});
