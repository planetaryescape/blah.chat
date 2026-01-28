export interface MathSegment {
  type: "text" | "math";
  content: string;
  isBlock?: boolean;
}

export interface MathExtractionResult {
  hasMath: boolean;
  segments: MathSegment[];
}

/**
 * Normalize LaTeX delimiters to consistent format.
 * AI models often use \(...\) for inline and \[...\] for block math,
 * but we'll convert to $$...$$ for consistency.
 * Skips code blocks to avoid breaking LaTeX source display.
 */
export function normalizeLatexDelimiters(text: string): string {
  // Fast path: skip if no LaTeX-style delimiters present
  if (!text.includes("\\(") && !text.includes("\\[")) return text;

  // Split by code blocks (fenced and inline) to avoid processing code
  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`\n]+`)/);

  return parts
    .map((part) => {
      // If it starts with ` it's code, return unchanged
      if (part.startsWith("`")) return part;

      // Convert \(...\) to inline $$...$$
      let result = part.replace(/\\\(([^)]*?)\\\)/g, "$$$$$1$$$$");

      // Convert \[...\] to block $$...$$ (with newlines for display mode)
      result = result.replace(/\\\[([^\]]*?)\\\]/g, "\n$$$$$1$$\n");

      return result;
    })
    .join("");
}

/**
 * Extract math blocks from text, returning segments for separate rendering.
 * This allows us to render math in WebView while keeping regular markdown native.
 */
export function extractMathBlocks(text: string): MathExtractionResult {
  const segments: MathSegment[] = [];
  let hasMath = false;

  // Pattern to match both inline $$...$$ and block math (on separate lines)
  // Block math: $$ on its own line, content, $$ on its own line
  // Inline math: $$...$$ on same line as text

  // First, handle block math ($$\n...\n$$)
  const _blockPattern = /^\$\$\n([\s\S]*?)\n\$\$/gm;
  // Then inline math ($$...$$)
  const _inlinePattern = /\$\$([^$]+)\$\$/g;

  const _remaining = text;
  const _lastIndex = 0;

  // Check for block math patterns first
  const blockMatches = [...text.matchAll(/\n?\$\$\n([\s\S]*?)\n\$\$\n?/g)];
  const inlineMatches = [...text.matchAll(/\$\$([^$\n]+)\$\$/g)];

  if (blockMatches.length === 0 && inlineMatches.length === 0) {
    return { hasMath: false, segments: [{ type: "text", content: text }] };
  }

  hasMath = true;

  // Combine and sort all matches by position
  interface Match {
    index: number;
    end: number;
    content: string;
    isBlock: boolean;
  }

  const allMatches: Match[] = [
    ...blockMatches.map((m) => ({
      index: m.index!,
      end: m.index! + m[0].length,
      content: m[1],
      isBlock: true,
    })),
    ...inlineMatches.map((m) => ({
      index: m.index!,
      end: m.index! + m[0].length,
      content: m[1],
      isBlock: false,
    })),
  ].sort((a, b) => a.index - b.index);

  // Filter out inline matches that are inside block matches
  const filteredMatches = allMatches.filter((match, i) => {
    if (!match.isBlock) {
      for (const blockMatch of allMatches) {
        if (
          blockMatch.isBlock &&
          match.index >= blockMatch.index &&
          match.end <= blockMatch.end
        ) {
          return false;
        }
      }
    }
    return true;
  });

  // Build segments
  let currentPos = 0;
  for (const match of filteredMatches) {
    // Add text before this match
    if (match.index > currentPos) {
      const textContent = text.slice(currentPos, match.index);
      if (textContent.trim()) {
        segments.push({ type: "text", content: textContent });
      }
    }

    // Add math segment
    segments.push({
      type: "math",
      content: match.content.trim(),
      isBlock: match.isBlock,
    });

    currentPos = match.end;
  }

  // Add remaining text
  if (currentPos < text.length) {
    const textContent = text.slice(currentPos);
    if (textContent.trim()) {
      segments.push({ type: "text", content: textContent });
    }
  }

  return { hasMath, segments };
}
