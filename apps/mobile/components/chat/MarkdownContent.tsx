import { memo, useMemo } from "react";
import { View } from "react-native";
import Markdown, { type RenderRules } from "react-native-markdown-display";
import { processBibleVerses } from "@/lib/bible/parser";
import {
  extractMathBlocks,
  normalizeLatexDelimiters,
} from "@/lib/text/mathProcessor";
import { palette, spacing, typography } from "@/lib/theme/designSystem";
import { BibleVerseLink } from "./BibleVerseLink";
import { CodeBlock } from "./CodeBlock";
import { MathRenderer } from "./MathRenderer";
import { MermaidPlaceholder } from "./MermaidPlaceholder";

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
  textColor?: string;
}

const baseMarkdownStyles = {
  body: {
    color: palette.starlight,
    fontFamily: typography.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  heading1: {
    color: palette.starlight,
    fontFamily: typography.heading,
    fontSize: 22,
    marginVertical: spacing.sm,
  },
  heading2: {
    color: palette.starlight,
    fontFamily: typography.heading,
    fontSize: 18,
    marginVertical: spacing.sm,
  },
  heading3: {
    color: palette.starlight,
    fontFamily: typography.bodySemiBold,
    fontSize: 16,
    marginVertical: spacing.xs,
  },
  code_inline: {
    backgroundColor: palette.glassMedium,
    color: palette.roseQuartz,
    fontFamily: "Courier",
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  blockquote: {
    backgroundColor: palette.glassLow,
    borderLeftWidth: 3,
    borderLeftColor: palette.roseQuartz,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
    marginVertical: spacing.sm,
  },
  link: {
    color: palette.roseQuartz,
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },
  list_item: {
    marginVertical: 2,
  },
  bullet_list: {
    marginVertical: spacing.xs,
  },
  ordered_list: {
    marginVertical: spacing.xs,
  },
  paragraph: {
    marginVertical: spacing.xs,
  },
  strong: {
    fontFamily: typography.bodySemiBold,
  },
};

function createRules(textColor: string): RenderRules {
  return {
    fence: (node, children, parent, styles) => {
      const language = node.sourceInfo || "";
      const code = node.content || "";

      // Handle Mermaid diagrams
      if (language === "mermaid") {
        return <MermaidPlaceholder key={node.key} code={code} />;
      }

      return <CodeBlock key={node.key} code={code} language={language} />;
    },
    code_block: (node, children, parent, styles) => {
      const code = node.content || "";
      return <CodeBlock key={node.key} code={code} />;
    },
    // Override link to handle Bible verses
    link: (node, children, parent, styles) => {
      const href = node.attributes?.href || "";

      // Handle Bible verse links
      if (href.startsWith("bible://")) {
        const osis = href.replace("bible://", "");
        return (
          <BibleVerseLink key={node.key} osis={osis}>
            {children}
          </BibleVerseLink>
        );
      }

      // Default link handling - react-native-markdown-display handles this
      return undefined;
    },
  };
}

function MarkdownContentComponent({
  content,
  isStreaming = false,
  textColor = palette.starlight,
}: MarkdownContentProps) {
  // Process content: normalize LaTeX, detect Bible verses
  const processedContent = useMemo(() => {
    let result = normalizeLatexDelimiters(content);
    result = processBibleVerses(result);
    return result;
  }, [content]);

  // Check for math blocks
  const { hasMath, segments } = useMemo(
    () => extractMathBlocks(processedContent),
    [processedContent],
  );

  const rules = useMemo(() => createRules(textColor), [textColor]);

  const styles = useMemo(
    () => ({
      ...baseMarkdownStyles,
      body: {
        ...baseMarkdownStyles.body,
        color: textColor,
      },
      heading1: { ...baseMarkdownStyles.heading1, color: textColor },
      heading2: { ...baseMarkdownStyles.heading2, color: textColor },
      heading3: { ...baseMarkdownStyles.heading3, color: textColor },
    }),
    [textColor],
  );

  // If we have math, render segments separately
  if (hasMath) {
    return (
      <View>
        {segments.map((segment, index) => {
          if (segment.type === "math") {
            return (
              <MathRenderer
                key={`math-${index}`}
                latex={segment.content}
                isBlock={segment.isBlock}
              />
            );
          }
          // Regular markdown segment
          return (
            <Markdown key={`md-${index}`} style={styles} rules={rules}>
              {segment.content}
            </Markdown>
          );
        })}
      </View>
    );
  }

  return (
    <Markdown style={styles} rules={rules}>
      {processedContent}
    </Markdown>
  );
}

export const MarkdownContent = memo(MarkdownContentComponent);
