import { describe, expect, it } from "vitest";

import {
  hasLoneSurrogates,
  isJsonSafe,
  StreamingTextBuffer,
  safeJsonStringify,
  sanitizeLoneSurrogates,
} from "../utf8Safe";

describe("StreamingTextBuffer", () => {
  it("handles complete chunks immediately", () => {
    const buffer = new StreamingTextBuffer();
    const result = buffer.process("Hello world");
    expect(result).toBe("Hello world");
  });

  it("handles empty chunks", () => {
    const buffer = new StreamingTextBuffer();
    expect(buffer.process("")).toBe("");
    expect(buffer.process(null as unknown as string)).toBe("");
  });

  it("buffers trailing high surrogates", () => {
    const buffer = new StreamingTextBuffer();

    // High surrogate for emoji (first half of surrogate pair)
    const highSurrogate = "\uD83D"; // First half of 😀

    const r1 = buffer.process(`Hello ${highSurrogate}`);
    expect(r1).toBe("Hello "); // High surrogate buffered

    // Complete the pair
    const lowSurrogate = "\uDE00"; // Second half of 😀
    const r2 = buffer.process(`${lowSurrogate} world`);
    expect(r2).toBe("😀 world"); // Pair assembled
  });

  it("flushes remaining content", () => {
    const buffer = new StreamingTextBuffer();

    buffer.process("Hello");
    const flushed = buffer.flush();
    expect(flushed).toBe("");

    // Now with pending high surrogate
    const buffer2 = new StreamingTextBuffer();
    buffer2.process("Test\uD83D"); // Trailing high surrogate
    const flushed2 = buffer2.flush();
    expect(flushed2).toBe("\uFFFD"); // Replaced with replacement char
  });

  it("handles emoji correctly", () => {
    const buffer = new StreamingTextBuffer();
    const result = buffer.process("🎉🎊🎈") + buffer.flush();
    expect(result).toBe("🎉🎊🎈");
    expect(isJsonSafe(result)).toBe(true);
  });

  it("handles CJK characters correctly", () => {
    const buffer = new StreamingTextBuffer();
    const japanese = "こんにちは世界";
    const result = buffer.process(japanese) + buffer.flush();
    expect(result).toBe(japanese);
    expect(isJsonSafe(result)).toBe(true);
  });

  it("handles complex emoji sequences", () => {
    const buffer = new StreamingTextBuffer();
    // Family emoji with ZWJ sequences
    const family = "👨‍👩‍👧‍👦";
    const result = buffer.process(family) + buffer.flush();
    expect(result).toBe(family);
    expect(isJsonSafe(result)).toBe(true);
  });

  it("reports pending status correctly", () => {
    const buffer = new StreamingTextBuffer();
    expect(buffer.hasPending()).toBe(false);

    buffer.process("test\uD83D"); // High surrogate pending
    expect(buffer.hasPending()).toBe(true);

    buffer.flush();
    expect(buffer.hasPending()).toBe(false);
  });
});

describe("hasLoneSurrogates", () => {
  it("returns false for valid strings", () => {
    expect(hasLoneSurrogates("Hello world")).toBe(false);
    expect(hasLoneSurrogates("😀")).toBe(false);
    expect(hasLoneSurrogates("こんにちは")).toBe(false);
    expect(hasLoneSurrogates("👨‍👩‍👧‍👦")).toBe(false);
  });

  it("returns true for lone high surrogate", () => {
    expect(hasLoneSurrogates("Hello \uD83D")).toBe(true);
  });

  it("returns true for lone low surrogate", () => {
    expect(hasLoneSurrogates("Hello \uDE00")).toBe(true);
  });

  it("returns false for proper surrogate pair", () => {
    expect(hasLoneSurrogates("\uD83D\uDE00")).toBe(false); // 😀
  });
});

describe("sanitizeLoneSurrogates", () => {
  it("keeps valid strings unchanged", () => {
    expect(sanitizeLoneSurrogates("Hello world")).toBe("Hello world");
    expect(sanitizeLoneSurrogates("😀🎉")).toBe("😀🎉");
  });

  it("removes lone high surrogates", () => {
    expect(sanitizeLoneSurrogates("Hello \uD83D world")).toBe("Hello  world");
  });

  it("removes lone low surrogates", () => {
    expect(sanitizeLoneSurrogates("Hello \uDE00 world")).toBe("Hello  world");
  });

  it("preserves valid surrogate pairs", () => {
    expect(sanitizeLoneSurrogates("\uD83D\uDE00")).toBe("😀");
  });
});

describe("isJsonSafe", () => {
  it("returns true for valid JSON strings", () => {
    expect(isJsonSafe("Hello world")).toBe(true);
    expect(isJsonSafe("😀🎉")).toBe(true);
    expect(isJsonSafe("こんにちは")).toBe(true);
  });

  it("returns true for lone surrogates (JSON.stringify replaces them in modern JS)", () => {
    // Note: Modern JS engines handle this gracefully
    // This test documents actual behavior
    expect(isJsonSafe("Hello \uD83D")).toBe(true);
  });
});

describe("safeJsonStringify", () => {
  it("stringifies valid objects normally", () => {
    const obj = { message: "Hello 😀" };
    expect(safeJsonStringify(obj)).toBe('{"message":"Hello 😀"}');
  });

  it("stringifies valid strings", () => {
    expect(safeJsonStringify("Hello")).toBe('"Hello"');
  });

  it("handles strings with emoji", () => {
    const result = safeJsonStringify("🎉🎊🎈");
    expect(JSON.parse(result)).toBe("🎉🎊🎈");
  });
});
