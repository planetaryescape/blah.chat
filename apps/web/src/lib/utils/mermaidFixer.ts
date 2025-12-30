/**
 * Mermaid Syntax Auto-Fixer
 *
 * Automatically corrects common syntax errors in LLM-generated Mermaid diagrams.
 * Focuses on conservative fixes that don't change diagram structure.
 */

/**
 * Fix common syntax errors in Mermaid diagram code
 *
 * Currently fixes:
 * - Unquoted node labels containing /, ?, & characters
 * - Unquoted node labels containing {, }, : characters (JSON-like content)
 * - Converts [{...}] diamond shapes with JSON to ["..."] rectangles
 *
 * @param code - Raw Mermaid diagram code
 * @returns Fixed Mermaid code (or original if no fixes needed)
 *
 * @example
 * fixMermaidSyntax('A --> B[/api/v1/users]')
 * // Returns: 'A --> B["/api/v1/users"]'
 *
 * @example
 * fixMermaidSyntax('A --> B[{"key": "value"}]')
 * // Returns: 'A --> B["{\\"key\\": \\"value\\"}"]'
 */
export function fixMermaidSyntax(code: string): string {
  // Handle edge cases
  if (!code || typeof code !== "string") {
    return code;
  }

  let fixed = code;

  // Rule 1: Fix [{...}] patterns (diamond shape with JSON content)
  // Mermaid interprets [{ as diamond shape start, but if it contains JSON-like content,
  // it's likely meant to be a regular rectangle with quoted JSON
  // Match the full content including nested braces by looking for the closing }]
  fixed = fixed.replace(/(\w+)\[\{(.*?)\}\]/g, (match, nodeId, content) => {
    // This looks like JSON content in a diamond shape - convert to quoted rectangle
    // Mermaid doesn't accept escaped quotes \" inside strings, so we use #quot; (HTML entity)
    const fullContent = `{${content}}`;
    const escapedContent = fullContent.replace(/"/g, "#quot;");
    return `${nodeId}["${escapedContent}"]`;
  });

  // Rule 2: Quote node labels with special characters (/, ?, &, :)
  // This handles URL paths and other special content
  // Note: We do this AFTER Rule 1 to avoid double-processing
  fixed = fixed.replace(
    /(\w+)\[([^\]"]*[/?&:][^\]"]*)\]/g,
    (match, nodeId, content) => {
      // Skip if already properly quoted (starts and ends with quotes)
      const trimmedContent = content.trim();
      if (
        (trimmedContent.startsWith('"') && trimmedContent.endsWith('"')) ||
        (trimmedContent.startsWith("'") && trimmedContent.endsWith("'")) ||
        (trimmedContent.startsWith("`") && trimmedContent.endsWith("`"))
      ) {
        return match;
      }

      // Escape any existing quotes in the content
      const escapedContent = content.replace(/"/g, '\\"');

      // Add quotes
      return `${nodeId}["${escapedContent}"]`;
    },
  );

  return fixed;
}
