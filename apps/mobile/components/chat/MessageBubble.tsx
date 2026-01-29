import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import Clipboard from "@react-native-clipboard/clipboard";
import {
  Check,
  Copy,
  GitBranch,
  MoreHorizontal,
  Pencil,
  RotateCcw,
} from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { useStreamBuffer } from "@/lib/hooks/useStreamBuffer";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { MarkdownContent } from "./MarkdownContent";
import { SiblingNavigator } from "./SiblingNavigator";
import { StreamingCursor } from "./StreamingCursor";
import { TypingIndicator } from "./TypingIndicator";

type Message = Doc<"messages">;

interface MessageBubbleProps {
  message: Message;
  conversationId: Id<"conversations">;
  onMorePress?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onRegenerate?: (message: Message) => void;
  onBranch?: (message: Message) => void;
}

function MessageBubbleComponent({
  message,
  conversationId,
  onMorePress,
  onEdit,
  onRegenerate,
  onBranch,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isPending = message.status === "pending";
  const isGenerating = message.status === "generating";
  const hasError = message.status === "error";
  const isComplete = message.status === "complete";
  const rawContent = message.partialContent || message.content || "";

  const [copied, setCopied] = useState(false);

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

  // Show actions only when message is complete and has content
  const showActions = isComplete && rawContent.length > 0;

  const handleCopy = () => {
    Clipboard.setString(message.content || "");
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Quick action button - uses TouchableOpacity from RNGH to avoid
  // gesture conflicts with parent Pressable's onLongPress
  const ActionButton = ({
    icon: Icon,
    onPress,
    isActive,
  }: {
    icon: typeof Copy;
    onPress: () => void;
    isActive?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        padding: spacing.xs,
        borderRadius: layout.radius.sm,
      }}
    >
      <Icon
        size={16}
        color={isActive ? palette.roseQuartz : palette.starlightDim}
      />
    </TouchableOpacity>
  );

  // Assistant messages: full width, no bubble
  if (!isUser) {
    return (
      <Pressable
        onLongPress={() => onMorePress?.(message)}
        delayLongPress={500}
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

        {/* Model indicator + Actions row */}
        {!showTypingIndicator && (
          <Reanimated.View
            entering={FadeIn.duration(200)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: spacing.xs,
            }}
          >
            {/* Quick Actions + Sibling Navigator on LEFT for assistant */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              {showActions && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.xs,
                  }}
                >
                  <ActionButton
                    icon={copied ? Check : Copy}
                    onPress={handleCopy}
                    isActive={copied}
                  />
                  <ActionButton
                    icon={RotateCcw}
                    onPress={() => onRegenerate?.(message)}
                  />
                  <ActionButton
                    icon={GitBranch}
                    onPress={() => onBranch?.(message)}
                  />
                  <ActionButton
                    icon={MoreHorizontal}
                    onPress={() => onMorePress?.(message)}
                  />
                </View>
              )}
              <SiblingNavigator
                message={message}
                conversationId={conversationId}
              />
            </View>

            {/* Model name on RIGHT */}
            {message.model && (
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 11,
                  color: palette.starlightDim,
                }}
              >
                {getModelDisplayName(message.model)}
              </Text>
            )}
          </Reanimated.View>
        )}
      </Pressable>
    );
  }

  // User messages: bubble on right, reduced padding
  return (
    <Pressable
      onLongPress={() => onMorePress?.(message)}
      delayLongPress={500}
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

      {/* Quick Actions + Sibling Navigator for user messages */}
      {(showActions || true) && (
        <Reanimated.View
          entering={FadeIn.duration(200)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginTop: spacing.xs,
          }}
        >
          <SiblingNavigator message={message} conversationId={conversationId} />
          {showActions && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
              }}
            >
              <ActionButton
                icon={copied ? Check : Copy}
                onPress={handleCopy}
                isActive={copied}
              />
              <ActionButton icon={Pencil} onPress={() => onEdit?.(message)} />
              <ActionButton
                icon={GitBranch}
                onPress={() => onBranch?.(message)}
              />
              <ActionButton
                icon={MoreHorizontal}
                onPress={() => onMorePress?.(message)}
              />
            </View>
          )}
        </Reanimated.View>
      )}
    </Pressable>
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
