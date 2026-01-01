/**
 * Markdown Component - Renders markdown content with terminal styling
 *
 * Uses marked + marked-terminal for:
 * - Syntax highlighted code blocks
 * - Styled headers, bold, italic
 * - Lists, blockquotes, tables
 * - Links (blue underlined)
 *
 * Note: FORCE_COLOR=3 is set via tsup banner (tsup.config.ts) to enable chalk colors
 */

import { Text } from "ink";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { useMemo } from "react";

// Configure marked with terminal renderer (uses chalk defaults)
marked.use(markedTerminal());

interface MarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export function Markdown({ content, isStreaming }: MarkdownProps) {
  const rendered = useMemo(() => {
    try {
      // For streaming, append cursor indicator
      const textToRender = isStreaming ? `${content}▌` : content;
      // Parse markdown and render to ANSI
      return marked.parse(textToRender, { async: false }) as string;
    } catch {
      // Fallback to raw content on error
      return content;
    }
  }, [content, isStreaming]);

  // marked-terminal outputs ANSI-escaped strings
  // Ink's Text component will render them correctly
  return <Text>{rendered}</Text>;
}
