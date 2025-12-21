import { describe, expect, it } from "vitest";

import { detectFormat, parseImportFile, validateImportFile } from "../index";

describe("detectFormat", () => {
  it("detects blah.chat JSON export format", () => {
    const content = JSON.stringify({
      version: "1.0",
      conversations: [],
      exportedAt: "2024-01-01",
    });
    expect(detectFormat(content)).toBe("json");
  });

  it("detects ChatGPT format with mapping", () => {
    const content = JSON.stringify({
      title: "Test",
      mapping: {
        node1: { id: "node1", author: { role: "user" }, content: { parts: ["Hello"] } },
      },
    });
    expect(detectFormat(content)).toBe("chatgpt");
  });

  it("detects ChatGPT format as array", () => {
    const content = JSON.stringify([
      {
        title: "Test",
        mapping: {
          node1: { id: "node1", author: { role: "user" }, content: { parts: ["Hello"] } },
        },
      },
    ]);
    expect(detectFormat(content)).toBe("chatgpt");
  });

  it("detects generic JSON with conversations field", () => {
    const content = JSON.stringify({
      conversations: [{ title: "Test", messages: [] }],
    });
    expect(detectFormat(content)).toBe("json");
  });

  it("detects markdown starting with #", () => {
    const content = "# My Conversation\n\n## You\n\nHello world";
    expect(detectFormat(content)).toBe("markdown");
  });

  it("detects markdown with ## You pattern", () => {
    const content = "Some content\n## You\n\nHello";
    expect(detectFormat(content)).toBe("markdown");
  });

  it("detects markdown with ## Assistant pattern", () => {
    const content = "Some content\n## Assistant\n\nHello";
    expect(detectFormat(content)).toBe("markdown");
  });

  it("returns unknown for unrecognized format", () => {
    const content = "Just some random text without any structure";
    expect(detectFormat(content)).toBe("unknown");
  });

  it("returns unknown for invalid JSON", () => {
    const content = "{ invalid json }";
    expect(detectFormat(content)).toBe("unknown");
  });

  it("handles whitespace around content", () => {
    const content = `  \n\n  ${JSON.stringify({ version: "1.0", conversations: [], exportedAt: "2024-01-01" })}  \n  `;
    expect(detectFormat(content)).toBe("json");
  });
});

describe("validateImportFile", () => {
  it("accepts valid JSON file", () => {
    const file = new File(["{}"], "export.json", { type: "application/json" });
    expect(validateImportFile(file)).toEqual({ valid: true });
  });

  it("accepts valid markdown file", () => {
    const file = new File(["# Title"], "export.md", { type: "text/markdown" });
    expect(validateImportFile(file)).toEqual({ valid: true });
  });

  it("accepts valid txt file", () => {
    const file = new File(["content"], "export.txt", { type: "text/plain" });
    expect(validateImportFile(file)).toEqual({ valid: true });
  });

  it("rejects file over 10MB", () => {
    // Create a large string (11MB)
    const largeContent = "x".repeat(11 * 1024 * 1024);
    const file = new File([largeContent], "large.json", { type: "application/json" });
    const result = validateImportFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("rejects invalid file extension", () => {
    const file = new File(["content"], "export.pdf", { type: "application/pdf" });
    const result = validateImportFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  it("handles uppercase extensions", () => {
    const file = new File(["{}"], "export.JSON", { type: "application/json" });
    expect(validateImportFile(file)).toEqual({ valid: true });
  });
});

describe("parseImportFile", () => {
  it("routes JSON format to JSON parser", () => {
    const content = JSON.stringify({
      version: "1.0",
      exportedAt: "2024-01-01",
      conversations: [
        {
          title: "Test",
          messages: [{ role: "user", content: "Hello" }],
        },
      ],
    });
    const result = parseImportFile(content);
    expect(result.success).toBe(true);
    expect(result.data?.format).toBe("json");
  });

  it("routes ChatGPT format to ChatGPT parser", () => {
    const content = JSON.stringify({
      title: "Test Chat",
      mapping: {
        node1: {
          id: "node1",
          author: { role: "user" },
          content: { content_type: "text", parts: ["Hello"] },
        },
      },
    });
    const result = parseImportFile(content);
    expect(result.success).toBe(true);
    expect(result.data?.format).toBe("chatgpt");
  });

  it("routes markdown format to markdown parser", () => {
    const content = `# Test Conversation

## You

Hello world

## Assistant

Hi there!`;
    const result = parseImportFile(content);
    expect(result.success).toBe(true);
    expect(result.data?.format).toBe("markdown");
  });

  it("returns error for unknown format", () => {
    const content = "random unstructured text";
    const result = parseImportFile(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unable to detect file format");
  });
});
