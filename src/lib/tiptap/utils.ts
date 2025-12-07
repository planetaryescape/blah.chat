import DOMPurify from "dompurify";
import { marked } from "marked";

/**
 * Convert markdown to sanitized HTML
 * Storage: markdown is source of truth, HTML is cached for fast display
 */
export function markdownToHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "br",
      "hr",
      "strong",
      "em",
      "code",
      "pre",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
    ],
    ALLOWED_ATTR: ["href", "class"],
  });
}

/**
 * Extract title from content (first line or first heading)
 */
export function extractTitle(markdown: string): string {
  const lines = markdown.split("\n").filter((line) => line.trim());
  if (!lines.length) return "Untitled Note";

  const firstLine = lines[0];
  // Remove markdown heading syntax
  return firstLine.replace(/^#+\s*/, "").trim() || "Untitled Note";
}

/**
 * Generate excerpt for preview (first 150 chars)
 */
export function generateExcerpt(markdown: string, maxLength = 150): string {
  const plainText = markdown
    .replace(/^#+\s*/gm, "") // Remove headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.+?)\*/g, "$1") // Remove italic
    .replace(/`(.+?)`/g, "$1") // Remove code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Remove links
    .trim();

  return plainText.length > maxLength
    ? `${plainText.slice(0, maxLength)}...`
    : plainText;
}
