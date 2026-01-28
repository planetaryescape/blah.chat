import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { memo } from "react";
import { Text, View } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { useStreamBuffer } from "@/lib/hooks/useStreamBuffer";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { MarkdownContent } from "./MarkdownContent";
import { StreamingCursor } from "./StreamingCursor";
import { TypingIndicator } from "./TypingIndicator";

type Message = Doc<"messages">;

interface MessageBubbleProps {
  message: Message;
}

function MessageBubbleComponent({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isPending = message.status === "pending";
  const isGenerating = message.status === "generating";
  const hasError = message.status === "error";
  const rawContent = message.partialContent || message.content || "";

  // Use stream buffer for smooth word-by-word reveal
  const { displayContent, hasBufferedContent } = useStreamBuffer(
    rawContent,
    isGenerating,
    { wordsPerSecond: 30 },
  );

  // Show typing indicator for pending/generating messages with no content
  const showTypingIndicator = (isPending || isGenerating) && !rawContent;

  // Show cursor while streaming or buffer is draining
  const showCursor = isGenerating || hasBufferedContent;

  // Assistant messages: full width, no bubble
  if (!isUser) {
    return (
      <View
        style={{
          marginVertical: spacing.sm,
          paddingHorizontal: spacing.md,
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
          <View>
            <MarkdownContent
              content={displayContent}
              isStreaming={isGenerating}
            />
            {showCursor && <StreamingCursor />}
          </View>
        )}

        {/* Model indicator */}
        {message.model && !showTypingIndicator && (
          <Reanimated.View entering={FadeIn.duration(200)}>
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 11,
                color: palette.starlightDim,
                marginTop: spacing.xs,
              }}
            >
              {getModelDisplayName(message.model)}
            </Text>
          </Reanimated.View>
        )}
      </View>
    );
  }

  // User messages: bubble on right, reduced padding
  return (
    <View
      style={{
        alignItems: "flex-end",
        marginVertical: spacing.xs,
        paddingHorizontal: spacing.md,
      }}
    >
      <View
        style={{
          maxWidth: "80%",
          backgroundColor: "rgba(244, 224, 220, 0.1)",
          borderRadius: layout.radius.lg,
          borderBottomRightRadius: layout.radius.xs,
          borderWidth: 1,
          borderColor: "rgba(244, 224, 220, 0.2)",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <MarkdownContent content={rawContent} textColor={palette.starlight} />
      </View>
    </View>
  );
}

function getModelDisplayName(modelId: string): string {
  const parts = modelId.split(":");
  if (parts.length > 1) {
    return parts[1];
  }
  return modelId;
}

export const MessageBubble = memo(MessageBubbleComponent);
