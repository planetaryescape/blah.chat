import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { memo } from "react";
import { Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { TypingIndicator } from "./TypingIndicator";

type Message = Doc<"messages">;

interface MessageBubbleProps {
  message: Message;
}

const markdownStyles = {
  body: {
    color: palette.starlight,
    fontFamily: typography.body,
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
  code_block: {
    backgroundColor: palette.obsidian,
    borderRadius: layout.radius.sm,
    padding: spacing.md,
    fontFamily: "Courier",
    fontSize: 13,
    color: palette.starlight,
  },
  fence: {
    backgroundColor: palette.obsidian,
    borderRadius: layout.radius.sm,
    padding: spacing.md,
    fontFamily: "Courier",
    fontSize: 13,
    color: palette.starlight,
    marginVertical: spacing.sm,
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
    color: palette.link,
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
};

const userMarkdownStyles = {
  ...markdownStyles,
  body: {
    ...markdownStyles.body,
    color: palette.void,
  },
  heading1: {
    ...markdownStyles.heading1,
    color: palette.void,
  },
  heading2: {
    ...markdownStyles.heading2,
    color: palette.void,
  },
  heading3: {
    ...markdownStyles.heading3,
    color: palette.void,
  },
  code_inline: {
    ...markdownStyles.code_inline,
    backgroundColor: "rgba(0,0,0,0.1)",
    color: palette.void,
  },
  link: {
    color: palette.void,
    textDecorationLine: "underline" as const,
  },
};

function MessageBubbleComponent({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isPending = message.status === "pending";
  const isGenerating = message.status === "generating";
  const hasError = message.status === "error";
  const content = message.partialContent || message.content || "";

  // Show typing indicator for pending/generating messages with no content
  const showTypingIndicator = (isPending || isGenerating) && !content;

  return (
    <View
      style={{
        alignItems: isUser ? "flex-end" : "flex-start",
        marginVertical: spacing.xs,
        paddingHorizontal: spacing.md,
      }}
    >
      <View
        style={{
          maxWidth: "85%",
          backgroundColor: isUser ? palette.roseQuartz : palette.glassLow,
          borderRadius: layout.radius.lg,
          borderBottomRightRadius: isUser ? layout.radius.xs : layout.radius.lg,
          borderBottomLeftRadius: isUser ? layout.radius.lg : layout.radius.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderWidth: isUser ? 0 : 1,
          borderColor: palette.glassBorder,
        }}
      >
        {hasError ? (
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 15,
              color: palette.error,
            }}
          >
            {message.error || "Something went wrong"}
          </Text>
        ) : showTypingIndicator ? (
          <TypingIndicator />
        ) : (
          <Markdown style={isUser ? userMarkdownStyles : markdownStyles}>
            {content}
          </Markdown>
        )}

        {/* Generating indicator while streaming */}
        {isGenerating && content && (
          <View
            style={{
              marginTop: spacing.xs,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <TypingIndicator />
          </View>
        )}
      </View>

      {/* Model indicator for assistant messages */}
      {!isUser && message.model && (
        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 11,
            color: palette.starlightDim,
            marginTop: 2,
            marginLeft: spacing.xs,
          }}
        >
          {getModelDisplayName(message.model)}
        </Text>
      )}
    </View>
  );
}

function getModelDisplayName(modelId: string): string {
  // Extract just the model name from "provider:model-name"
  const parts = modelId.split(":");
  if (parts.length > 1) {
    return parts[1];
  }
  return modelId;
}

export const MessageBubble = memo(MessageBubbleComponent);
