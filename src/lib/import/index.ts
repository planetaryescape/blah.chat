import { parseChatGPT } from "./parsers/chatgpt";
import { parseJSON } from "./parsers/json";
import { parseMarkdown } from "./parsers/markdown";
import type { ImportResult } from "./types";

export * from "./types";

/**
 * Detect format from file content
 */
export function detectFormat(
  content: string,
): "json" | "markdown" | "chatgpt" | "unknown" {
  const trimmed = content.trim();

  // Try JSON first
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed);

      // Check for blah.chat export format
      if (data.version && data.conversations && data.exportedAt) {
        return "json";
      }

      // Check for ChatGPT format
      if (data.mapping || (Array.isArray(data) && data[0]?.mapping)) {
        return "chatgpt";
      }

      // Generic JSON that might be our format
      if (data.conversations) {
        return "json";
      }
    } catch {
      // Not valid JSON
    }
  }

  // Check for Markdown
  if (
    trimmed.startsWith("#") ||
    trimmed.includes("## You") ||
    trimmed.includes("## Assistant")
  ) {
    return "markdown";
  }

  return "unknown";
}

/**
 * Parse import file based on detected format
 */
export function parseImportFile(content: string): ImportResult {
  const format = detectFormat(content);

  switch (format) {
    case "json":
      return parseJSON(content);

    case "markdown":
      return parseMarkdown(content);

    case "chatgpt":
      return parseChatGPT(content);

    default:
      return {
        success: false,
        error:
          "Unable to detect file format. Please upload a JSON, Markdown, or ChatGPT export file.",
      };
  }
}

/**
 * Validate file size and type before parsing
 */
export function validateImportFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB`,
    };
  }

  const validExtensions = [".json", ".md", ".txt"];
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

  if (!validExtensions.includes(extension)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a .json, .md, or .txt file",
    };
  }

  return { valid: true };
}
