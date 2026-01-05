/**
 * Strip markdown formatting for plain text preview
 * Removes all markdown syntax and returns clean text
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "") // Headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // Bold
    .replace(/\*(.+?)\*/g, "$1") // Italic
    .replace(/__(.+?)__/g, "$1") // Bold
    .replace(/_(.+?)_/g, "$1") // Italic
    .replace(/`(.+?)`/g, "$1") // Inline code
    .replace(/```[\s\S]*?```/g, "[code]") // Code blocks
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Links
    .replace(/!\[.*?\]\(.+?\)/g, "[image]") // Images
    .replace(/>\s+/g, "") // Blockquotes
    .replace(/[-*+]\s+/g, "") // Lists
    .replace(/\d+\.\s+/g, "") // Ordered lists
    .replace(/\n{2,}/g, " ") // Multiple newlines
    .replace(/\n/g, " ") // Single newlines
    .trim();
}
