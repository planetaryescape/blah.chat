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
import Reanimated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Doc, Id } from "@/lib/convex";
import { haptic } from "@/lib/haptics";
import { useStreamBuffer } from "@/lib/hooks/useStreamBuffer";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { hasRecentBranchTransition } from "./branchTransition";
import { MarkdownContent } from "./MarkdownContent";
import { SiblingNavigator } from "./SiblingNavigator";
import { StreamingCursor } from "./StreamingCursor";
import { TypingIndicator } from "./TypingIndicator";

type Message = Doc<"messages">;

function ActionButton({
  icon: Icon,
  onPress,
  isActive,
  accessibilityLabel,
}: {
  icon: typeof Copy;
  onPress: () => void;
  isActive?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
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
}

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
  const createdAt = message._creationTime ?? message.createdAt;
  const [shouldAnimateEntry] = useState(
    () => Date.now() - createdAt < 5000 || hasRecentBranchTransition(),
  );

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

  // Assistant messages: full width, no bubble
  if (!isUser) {
    return (
      <Reanimated.View
        entering={
          shouldAnimateEntry ? FadeInUp.duration(300).springify() : undefined
        }
        layout={LinearTransition.duration(220)}
      >
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
            <ErrorBoundary>
              <Reanimated.View
                key={`assistant-${message._id}`}
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                layout={LinearTransition.duration(220)}
              >
                <MarkdownContent
                  content={displayContent}
                  isStreaming={isGenerating}
                />
                {showCursor && <StreamingCursor />}
              </Reanimated.View>
            </ErrorBoundary>
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
                      accessibilityLabel={copied ? "Copied" : "Copy message"}
                    />
                    <ActionButton
                      icon={RotateCcw}
                      onPress={() => onRegenerate?.(message)}
                      accessibilityLabel="Regenerate response"
                    />
                    <ActionButton
                      icon={GitBranch}
                      onPress={() => onBranch?.(message)}
                      accessibilityLabel="Branch conversation"
                    />
                    <ActionButton
                      icon={MoreHorizontal}
                      onPress={() => onMorePress?.(message)}
                      accessibilityLabel="More actions"
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
      </Reanimated.View>
    );
  }

  // User messages: bubble on right, reduced padding
  return (
    <Reanimated.View
      entering={
        shouldAnimateEntry ? FadeInUp.duration(300).springify() : undefined
      }
      layout={LinearTransition.duration(220)}
    >
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
            backgroundColor: palette.roseQuartz10,
            borderRadius: layout.radius.lg,
            borderBottomRightRadius: layout.radius.xs,
            borderWidth: 1,
            borderColor: palette.roseQuartz20,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <ErrorBoundary>
            <Reanimated.View
              key={`user-${message._id}`}
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              layout={LinearTransition.duration(220)}
            >
              <MarkdownContent
                content={rawContent}
                textColor={palette.starlight}
              />
            </Reanimated.View>
          </ErrorBoundary>
        </View>

        {/* Quick Actions + Sibling Navigator for user messages */}
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
                accessibilityLabel={copied ? "Copied" : "Copy message"}
              />
              <ActionButton
                icon={Pencil}
                onPress={() => onEdit?.(message)}
                accessibilityLabel="Edit message"
              />
              <ActionButton
                icon={GitBranch}
                onPress={() => onBranch?.(message)}
                accessibilityLabel="Branch conversation"
              />
              <ActionButton
                icon={MoreHorizontal}
                onPress={() => onMorePress?.(message)}
                accessibilityLabel="More actions"
              />
            </View>
          )}
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
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
